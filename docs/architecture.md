# StylusFlow 架构详解

> 本文档面向需要深入理解代码结构的 Agent。日常开发先看 `CLAUDE.md`。

---

## 数据流：键盘快捷键 → 工具切换

```
用户按键
  ↓
MarginNote 调用 MNStylusFlowAddon.queryShortcutKeyWithKeyFlags()
  → ShortcutController.queryShortcut() 返回 {checked, disabled}（告知MN此键已注册）

用户松键
  ↓
MarginNote 调用 MNStylusFlowAddon.processShortcutKeyWithKeyFlags(command, keyFlags)
  → ToolWatcher.watch() 同步工具数量
  → ShortcutController.resolveAction(command, keyFlags) 查 reverseMap → actionId
  → CanvasToolController.find(sc.view) → pickerView
  → ActionProcessor.process(actionId, picker, _shortcutState)
      → resolveTargetSlot() 计算目标槽位
      → CanvasToolController.detectAllTools(picker) 获取工具列表
      → CanvasToolController.activate(tools[slot].view) 触发点击
  → ShortcutController.recordProcessResult() 记录 debug 状态
  → 如面板可见：_panel.refreshDebug()
  → 返回 true/false 给 MarginNote
```

---

## 数据流：用户在面板修改快捷键绑定

```
用户点击绑定行
  ↓
MNStylusFlowAddon.onShortcutBindingTap(sender)
  → _panel.handleShortcutBindingTap(tag)
  → ShortcutsView.handleBindingTap(tag)
  → actionIdByTag[tag] 查找 actionId
  → ShortcutEditor.open(actionId)
      → ShortcutController.getBinding(actionId) 获取当前绑定
      → ShortcutEditorView.build({...}) 构建 Modal UI
      → 将 overlay 添加到 pane

用户点击"保存"
  ↓
MNStylusFlowAddon.onShortcutEditorSave()
  → _panel.handleShortcutEditorSave()
  → ShortcutsView.handleEditorSave()
  → ShortcutEditor.handleSave()
      → ShortcutController.applyCustomBinding(actionId, input, flags)
          → ShortcutBindings.applyCustomBinding() 校验 + 规范化 + setBinding() 注册绑定 + 持久化
          → ShortcutRuntime.markBindingChanged() 记录 debug 状态
      → onBindingsUpdated() 回调（更新 bindingLabelMap，重渲染列表）
      → dismiss() 关闭 Modal
  → _panel.refreshShortcutBindings() 更新显示
  → sc.refreshAddonCommands() 通知 MN 刷新快捷键列表
```

---

## 数据流：PDF 拖拽平移（手势拦截）

```
EventInterceptor.start(addon)
  → UIViewTree.findAllNodesByClass(readerView, 'MbUIBookView') 找到全部书页视图
  → 每个视图附加 UIPanGestureRecognizer（selector: onInterceptPan:）
  → 其他已有手势识别器 requireGestureRecognizerToFail(rec) 让拦截器优先

用户在 PDF 页面拖动
  ↓
MNStylusFlowAddon.onInterceptPan:(recognizer)（panelEventFeature 委托）
  → EventInterceptor.handlePan(recognizer)
  → recognizer.translationInView(ref) 获取 dx/dy，立即重置为 {0,0}
  → DocumentScrollController.panStudyView(sc, dx, dy)
      → findScrollTarget() BFS 搜索候选 ScrollView，按 BookScrollView 优先 + 最大滚动范围排序
      → pan(target, dx, dy) clamp + setContentOffset 执行平移

场景切换时
  ↓
ToolWatcher.watch() → EventInterceptor.refresh()
  → 检查已附加视图是否仍有 superview
  → 对新出现的 MbUIBookView 追加 PanGestureRecognizer
```

---

## 数据流：脑图框选标定与桥接

```
用户点击「标定框选」
  ↓
MNStylusFlowAddon.onProbeMindMapBoxSelect:
  → documentPanDebugFeature 获取 studyController
  → MindMapBoxSelectController.startCalibration(sc)
      → MindMapBoxSelectRuntime.stopBoxSelectMode() 清理旧桥接/采样
      → MindMapBoxCalibration.start(sc)
          → MindMapShared.getMindMapTargets(sc) 读取 notebookController.mindmapView / mindMapView
          → MindMapBoxGestureCollector.collectRecognizerEntries(sc)
              → 从 mindMapView、MindMapCanvas、PKCanvasView、PKTiledGestureView 等候选根收集 gestureRecognizers
              → 从 description 提取 recognizerId/action/target/class 元信息
          → NSTimer 采样识别器 state 变化
          → 按连续状态变化 + selection/select/pan 关键词排序，记住最佳 SelectionPanGesture

用户点击「框选模式」
  ↓
MNStylusFlowAddon.onToggleMindMapBoxSelect:
  → MindMapBoxSelectController.toggleBoxSelectMode(sc)
      → 优先复用已标定 recognizerId；未标定时回退查找 SelectionPanGesture
      → MindMapBoxBridge.start(sc, recognizerId)
          → 找到 MindMapCanvas
          → 在原框选手势所在 ownerView 注入 UIPanGestureRecognizer
          → selector 指向 MindMapCanvas.handlePanGesture:
      → DebugContainer 同步按钮标题/颜色

用户再次点击「关闭框选」
  ↓
MindMapBoxSelectController.stopBoxSelectMode()
  → MindMapBoxCalibration.stop()
  → MindMapBoxBridge.stop() 移除注入的 UIPanGestureRecognizer
```

脑图滚动调试链路已经移除；当前脑图能力只保留框选标定与桥接。

---

## 状态管理

### 运行时状态（内存，重启后丢失）

| 状态 | 位置 | 描述 |
|------|------|------|
| `_shortcutState.lastToolSlot` | MNStylusFlowAddon | 上次激活的工具槽位（用于 prev/next 计算） |
| `_panel` | MNStylusFlowAddon | 面板实例引用 |
| `ToolWatcher._state` | ToolWatcher | 上次同步时间 + 工具特征签名 |
| `ShortcutRegistry.bindings` | ShortcutRegistry | 当前所有绑定（actionId → binding） |
| `ShortcutRegistry.reverseMap` | ShortcutRegistry | 反查表（input__flags → actionId） |
| `ShortcutRuntime.runtime` | ShortcutRuntime | Debug 统计（触发次数、最近动作等） |
| `PanGateController._lastHeartbeatAt` | PanGateController | PDF 平移门控最近触发时间 |
| `PanGateController._captureTarget` | PanGateController | PDF 平移触发键/停止键捕获目标 |
| `EventInterceptor._active/_pool` | EventInterceptor | PDF 手势拦截启停状态与识别器池 |
| `MindMapBoxCalibration._recognizerInfo` | MindMapBoxCalibration | 已标定的脑图框选识别器元信息 |
| `MindMapBoxBridge._bridge` | MindMapBoxBridge | 已注入的脑图框选桥接识别器与附着视图 |

### 持久化状态（NSUserDefaults）

- key: `stylusflow.shortcuts.bindings.v1`
- value: JSON 字符串，格式：`{ [actionId]: { input, flags, title } }`
- 操作入口：`ShortcutStorage.loadBindings()` / `saveBindings()` / `clearAllAddonConfigs()`
- key: `stylusflow.pangate.config.v1`
- value: JSON 字符串，格式：`{ expiredMs, triggerInput, triggerFlags, hasStopBinding, stopInput, stopFlags }`
- 操作入口：`PanGateStorage.load()` / `save()`，由 `PanGateBindings` 编排默认值、校验和归一化

---

## 快捷键系统设计

### Action ID 命名规则

```
tool.prev    ← 上一个工具
tool.next    ← 下一个工具
tool.1       ← 第 1 个工具（槽位从 1 开始）
tool.2       ← 第 2 个工具
tool.N       ← 第 N 个工具（N ≤ dynamicToolCount）
```

### dynamicToolCount 生命周期

1. 初始值：`DEFAULT_TOOL_COUNT = 8`（ShortcutConstants）
2. 每次 `ToolWatcher.watch()` 调用 `ShortcutController.syncToolCount(tools.length)`
3. 工具数量变化时：
   - 超出范围的绑定被自动删除（`ShortcutBindings.setDynamicToolCount`）
   - 触发 `sc.refreshAddonCommands()`（通知 MN 更新快捷键菜单）
   - 触发 `_panel.refreshShortcutBindings()`（更新 UI 显示）

### Modifier Flags（位运算）

```
SHIFT   = 1 << 17  = 131072
CONTROL = 1 << 18  = 262144
OPTION  = 1 << 19  = 524288
COMMAND = 1 << 20  = 1048576
```

Editor Modal 中 tag 与 flag 的对应：
- 3101 → COMMAND
- 3102 → OPTION
- 3103 → CONTROL
- 3104 → SHIFT

---

## UI 组件层级

```
MNStylusFlowAddon（JSExtension 实例）
  └── PanelContainer（containers/，App shell 协调器）
        ├── PanelView.build() → rootView（320×460 悬浮窗）   [views/]
        │     ├── titleBar（42px，可拖拽）
        │     └── tabBar（36px，快捷键/调试）
        ├── ShortcutsContainer（containers/，tab=0）
        │     ├── ShortcutsPaneView.build() → pane + scroll   [views/]
        │     │     ├── SectionHeader（可折叠分区）            [components/shortcuts/]
        │     │     ├── [展开时] BindingRow × N（tool.1~N）   [components/shortcuts/]
        │     │     ├── BindingRow（tool.prev）
        │     │     └── BindingRow（tool.next）
        │     └── ShortcutEditorContainer（containers/）
        │           └── EditorModal.build() → overlay         [components/shortcuts/]
        │                 ├── 标题 + 动作名 + 当前绑定显示
        │                 ├── 4个修饰键按钮（tag 3101-3104）
        │                 ├── 按键输入框
        │                 └── 取消/清除/保存 按钮
        └── DebugContainer（containers/，tab=1，hidden=true）
              ├── DebugPaneView.build() → pane + 按钮 + scroll  [views/]
              │     ├── 扫描工具 按钮
              │     ├── 重置配置 按钮
              │     ├── PDF 平移测试按钮（上/下/左/右）
              │     ├── 脑图框选按钮（标定/开关）
              │     └── PDF 事件拦截开关
              └── scroll 内容（由 DebugContainer.render() 驱动）
                    ├── InfoSection.build()（信息 KVRow 组）    [components/debug/]
                    └── ToolRow × N（可展开，展开时渲染 KVRow） [components/debug/]
```

---

## 事件处理路由

所有 UI 事件都通过 `addon`（JSExtension 实例）的 Selector 方法路由，然后委托给面板：

| Selector | 委托链 |
|----------|--------|
| `togglePanel:` | MNStylusFlowAddon → mount/unmount |
| `onPanelClose:` | MNStylusFlowAddon → _panel.unmount() |
| `onPanelPan:` | MNStylusFlowAddon → _panel.handlePan() |
| `onTabSwitch:` | MNStylusFlowAddon → _panel.switchTab(sender.tag) |
| `onShortcutBindingTap:` | MNStylusFlowAddon → _panel → ShortcutsContainer → ShortcutEditorContainer.open() |
| `onShortcutEditorModifierTap:` | MNStylusFlowAddon → _panel → ShortcutsContainer → ShortcutEditorContainer.handleModifierTap() |
| `onShortcutEditorSave:` | MNStylusFlowAddon → _panel → ShortcutsContainer → ShortcutEditorContainer.handleSave() |
| `onShortcutEditorClear:` | MNStylusFlowAddon → _panel → ShortcutsContainer → ShortcutEditorContainer.handleClear() |
| `onShortcutEditorCancel:` | MNStylusFlowAddon → _panel → ShortcutsContainer → ShortcutEditorContainer.handleCancel() |
| `onScanTools:` | MNStylusFlowAddon → ToolWatcher.watch(force) + _panel.scan() |
| `onResetAddonConfig:` | MNStylusFlowAddon → ShortcutController.clearAllPersistedConfig + restorePersistedBindings |
| `onToggleDirectToolsTab:` | MNStylusFlowAddon → _panel → ShortcutsContainer.toggleDirectToolsTab() |
| `onDebugToggle:` | MNStylusFlowAddon → _panel.toggleDebugItem(sender.tag) |
| `onActivateTool:` | MNStylusFlowAddon → _panel.activateTool(sender.tag) |
| `onInterceptPan:` | MNStylusFlowAddon → EventInterceptor.handlePan(recognizer) |
| `onTestPanUp:` | MNStylusFlowAddon → documentPanDebugFeature → DocumentScrollController.panStudyView(sc, 0, -40) |
| `onTestPanDown:` | MNStylusFlowAddon → documentPanDebugFeature → DocumentScrollController.panStudyView(sc, 0, +40) |
| `onTestPanLeft:` | MNStylusFlowAddon → documentPanDebugFeature → DocumentScrollController.panStudyView(sc, -40, 0) |
| `onTestPanRight:` | MNStylusFlowAddon → documentPanDebugFeature → DocumentScrollController.panStudyView(sc, +40, 0) |
| `onProbeMindMapBoxSelect:` | MNStylusFlowAddon → documentPanDebugFeature → MindMapBoxSelectController.startCalibration(sc) |
| `onToggleMindMapBoxSelect:` | MNStylusFlowAddon → documentPanDebugFeature → MindMapBoxSelectController.toggleBoxSelectMode(sc) |

---

## 代码约定

### 模块导出风格

```js
// 无状态工具模块（IIFE，全局对象）
const ModuleName = (function () {
  return { method1, method2 };
})();

// 有状态子组件（工厂函数，调用方持有实例）
function createXxx(config) {
  var _state = ...;
  return { publicApi };
}
```

### 新增模块时的 Checklist

1. 确认依赖的模块已在 `main.js` 中更早加载
2. 在 `main.js` 正确位置添加 `JSB.require('path/to/NewModule')`
3. 用户可见文字放入 `i18n/strings.js`
4. UI 结构放入 `ui/components/` 或 `ui/views/`，事件绑定和状态放入 `ui/containers/`

### 日志与发布约定

- `src/` 上线状态不保留 `console.*` 输出。
- 需要临时排查原生对象时，短期使用 `console.log`，不要使用 `JSB.log`。
- 调试完成后同步删除仅服务日志/探测的辅助函数、字符串和 UI 入口。
- 脑图滚动调试已经下线；后续脑图相关实现优先放在 `controller/mindmap/` 下拆分为共享、采集、标定、桥接、运行态模块。
