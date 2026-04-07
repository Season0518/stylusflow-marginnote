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

### 持久化状态（NSUserDefaults）

- key: `stylusflow.shortcuts.bindings.v1`
- value: JSON 字符串，格式：`{ [actionId]: { input, flags, title } }`
- 操作入口：`ShortcutStorage.loadBindings()` / `saveBindings()` / `clearAllAddonConfigs()`

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
  └── ToolPickerPanel（App shell 协调器）
        ├── ToolPickerView.build() → rootView（320×460 悬浮窗）
        │     ├── titleBar（42px，可拖拽）
        │     └── tabBar（36px，快捷键/调试）
        ├── ShortcutsView（contentHeight 区域，tab=0）
        │     ├── UIScrollView
        │     │     ├── 指定工具切换 折叠行（ShortcutRow）
        │     │     ├── [展开时] tool.1 ~ tool.N 行（ShortcutRow）
        │     │     ├── tool.prev 行（ShortcutRow）
        │     │     └── tool.next 行（ShortcutRow）
        │     └── [编辑时] ShortcutEditorView overlay
        │           └── Modal（248px 高）
        │                 ├── 标题 + 动作名 + 当前绑定显示
        │                 ├── 4个修饰键按钮（tag 3101-3104）
        │                 ├── 按键输入框
        │                 └── 取消/清除/保存 按钮
        └── DebugView（contentHeight 区域，tab=1，hidden=true）
              ├── 扫描工具 按钮
              ├── 重置配置 按钮
              └── UIScrollView
                    ├── key-value 信息行（DebugContentView.buildInfoRows）
                    └── 工具列表行（DebugContentView.buildToolRows，可展开）
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
| `onShortcutBindingTap:` | MNStylusFlowAddon → _panel → ShortcutsView → ShortcutEditor.open() |
| `onShortcutEditorModifierTap:` | MNStylusFlowAddon → _panel → ShortcutsView → ShortcutEditor.handleModifierTap() |
| `onShortcutEditorSave:` | MNStylusFlowAddon → _panel → ShortcutsView → ShortcutEditor.handleSave() |
| `onShortcutEditorClear:` | MNStylusFlowAddon → _panel → ShortcutsView → ShortcutEditor.handleClear() |
| `onShortcutEditorCancel:` | MNStylusFlowAddon → _panel → ShortcutsView → ShortcutEditor.handleCancel() |
| `onScanTools:` | MNStylusFlowAddon → ToolWatcher.watch(force) + _panel.scan() |
| `onResetAddonConfig:` | MNStylusFlowAddon → ShortcutController.clearAllPersistedConfig + restorePersistedBindings |
| `onToggleDirectToolsTab:` | MNStylusFlowAddon → _panel → ShortcutsPane.toggleDirectToolsTab() |
| `onDebugToggle:` | MNStylusFlowAddon → _panel.toggleDebugItem(sender.tag) |
| `onActivateTool:` | MNStylusFlowAddon → _panel.activateTool(sender.tag) |

---

## 代码约定

### 模块导出风格

```js
// 无状态工具模块（IIFE，全局对象）
var ModuleName = (function () {
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
3. 文件保持 ≤ 150 行
4. 用户可见文字放入 `i18n/strings.js`
5. UI 结构放入 `*View.js`，业务逻辑放入对应逻辑文件

