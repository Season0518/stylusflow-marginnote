# StylusFlow — Agent 开发手册

> **必读顺序**：先读本文件，再读 `AGENTS.md`（运行时约束与强制规则）。

---

## 项目一句话

MarginNote 4 插件，让用户用键盘快捷键切换画布工具（上一个/下一个/指定工具），并提供可拖拽的设置面板。

---

## ⚠️ 高频踩坑点（先看）

| 问题 | 正确做法 |
|------|---------|
| 想用 `import` / `export` | 不可用。用全局变量 + `JSB.require()` |
| 想用 `fetch` / `setTimeout` / DOM | 不存在。见 AGENTS.md §运行时 |
| 想加用户可见文字 | 先加到 `src/i18n/strings.js`，再用 `Strings.xxx` |
| 想写 UI 结构 | 写进对应 `ui/views/` 或 `ui/components/`，不要放进 containers |
| 不确定 API 是否存在 | 查 mn-docs MCP 或 https://mn-docs.museday.top |

---

## 文件地图（按职责）

```
src/
├── main.js                  ← 唯一入口，只做 JSB.require() + JSB.newAddon
├── MNStylusFlowAddon.js     ← 唯一 JSB.defineClass 调用点，组装 feature/* 后生成 JSExtension
│
├── feature/
│   ├── composeAddonMethods.js ← 将多个 feature 方法片段合并成单一方法对象
│   ├── lifecycleFeature.js    ← sceneWillConnect / Disconnect / controllerWillLayoutSubviews
│   ├── shortcutFeature.js     ← queryAddonCommandStatus / additionalShortcutKeys / processShortcut / togglePanel
│   ├── panelEventFeature.js   ← 所有 on* 面板事件委托
│   └── documentPanDebugFeature.js ← Debug 用：测试文档上下左右平移（onTestPanUp/Down/Left/Right）
│
├── i18n/
│   └── strings.js           ← 所有用户可见文字，通过 Strings.xxx 引用
│
├── core/
│   ├── UIViewTree.js        ← iOS view 遍历工具（safeValue/toArray/getClassName 等）
│   ├── ToolWatcher.js       ← 工具状态轮询，暴露 ToolWatcher.watch() / .reset()
│   └── ActionProcessor.js   ← 快捷键动作解析与工具激活，暴露 ActionProcessor.process()
│
├── controller/
│   ├── canvastool/
│   │   └── CanvasToolBridge.js          ← iOS 平台层：定位 CanvasToolPicker、工具排序、触发点击
│   ├── CanvasToolController.js          ← 业务门面：find / detectAllTools / activate（依赖 CanvasToolBridge）
│   ├── DocumentScrollController.js      ← 文档滚动：定位最佳 ScrollView 并执行平移（panStudyView）
│   ├── pangate/
│   │   ├── PanGateConstants.js          ← 常量（DEFAULT_*, MIN/MAX_EXPIRED_MS, STEP, STORAGE_KEY, QUERY_RESULT）
│   │   ├── PanGateStorage.js            ← NSUserDefaults 读写（纯 save/load，无业务逻辑）
│   │   ├── PanGateBindings.js           ← 配置状态 + 操作 + matchesTrigger/matchesStop（热路径匹配方法）
│   │   ├── PanGesturePool.js            ← MbUIBookView 识别器生命周期（工厂函数 createPanGesturePool）
│   │   └── EventInterceptor.js          ← 拦截生命周期 + 门控同步 + 平移转发（依赖 PanGesturePool）
│   ├── PanGateController.js             ← 门控心跳 + 捕获模式 + 热路径 queryKey/processKey + 公共 API facade
│   ├── ShortcutController.js            ← 快捷键公共 API 门面（统一入口）
│   └── shortcut/
│       ├── ShortcutConstants.js         ← FLAGS / ACTIONS 常量 + toolActionTitle()
│       ├── ShortcutFormatter.js         ← 输入规范化 + 显示格式化
│       ├── ShortcutStorage.js           ← NSUserDefaults 持久化
│       ├── ShortcutRegistry.js          ← 纯内存绑定数据结构（bindings / reverseMap / 冲突检测）
│       ├── ShortcutBindings.js          ← 绑定编排：校验、持久化时机、tool count 管理、查询格式化
│       └── ShortcutRuntime.js           ← Debug 运行时状态（触发次数/最近动作等）
│
├── utils/
│   └── NativeSerializer.js              ← 原生对象序列化（用于 debug 展示，依赖 CanvasToolController）
│
└── ui/
    ├── components/                      ← 可复用 UI 组件（纯视图，无状态）
    │   ├── base/
    │   │   ├── Card.js                  ← 圆角卡片容器 Card.make(frame, opts)
    │   │   ├── KeyBadge.js              ← 按键徽章 KeyBadge.make(parent, text, frame)
    │   │   └── KVRow.js                 ← 键值行 KVRow.make(parent, key, val, y, indent, w) → nextY
    │   ├── shortcuts/
    │   │   ├── BindingRow.js            ← 绑定行（card + 标题 + badge + 点击层）
    │   │   ├── SectionHeader.js         ← 可折叠分区标题行
    │   │   └── EditorModal.js           ← 编辑 Modal UI（overlay + modal card）
    │   └── debug/
    │       ├── ToolRow.js               ← 工具展开行 + 激活按钮（展开时渲染 KVRow）
    │       └── InfoSection.js           ← 快捷键运行时信息区（一组 KVRow）
    ├── views/                           ← Tab 级 UI 骨架（组合 components，不含状态）
    │   ├── PanelView.js                 ← 面板外壳（标题栏 + 标签栏 + 布局工具函数）
    │   ├── ShortcutsPaneView.js         ← Shortcuts tab 容器骨架（pane + scroll）
    │   └── DebugPaneView.js             ← Debug tab 容器骨架（pane + 按钮 + scroll）
    └── containers/                      ← 状态协调层（驱动 views/components，消费 controller）
        ├── PanelContainer.js            ← 面板根级协调（挂载/卸载/拖拽/标签切换）
        ├── ShortcutsContainer.js        ← Shortcuts tab 状态（绑定列表渲染、折叠）
        ├── ShortcutEditorContainer.js   ← 编辑器状态（open/dismiss/save/clear）
        └── DebugContainer.js            ← Debug tab 状态（数据构建、展开状态）
```

---

## 模块加载顺序（main.js）

**加载顺序即依赖顺序**，不可调换（JSB.require 进入全局作用域）：

```
1.  i18n/strings              ← 最先，所有模块都可能用到
2.  core/UIViewTree           ← 工具函数，CanvasToolController 依赖
3.  controller/canvastool/CanvasToolBridge ← iOS 平台层，CanvasToolController 依赖
4.  controller/CanvasToolController
5.  controller/shortcut/ShortcutConstants
6.  controller/shortcut/ShortcutFormatter  ← 依赖 ShortcutConstants
7.  controller/shortcut/ShortcutStorage    ← 依赖 ShortcutConstants
8.  controller/shortcut/ShortcutRegistry   ← 无业务依赖，纯内存数据结构
9.  controller/shortcut/ShortcutBindings   ← 依赖 Constants+Formatter+Storage+Registry
10. controller/shortcut/ShortcutRuntime    ← 依赖 Constants+Formatter
11. controller/ShortcutController          ← 依赖所有 shortcut/* 子模块，纯 wiring facade
12. core/ToolWatcher          ← 依赖 CanvasToolController + ShortcutController
13. core/ActionProcessor      ← 依赖 CanvasToolController + ShortcutController + Strings
14. controller/DocumentScrollController        ← 依赖 UIViewTree，无其他业务依赖
15. controller/pangate/PanGateConstants       ← 依赖 ShortcutConstants（FLAGS.OPTION）
16. controller/pangate/PanGateStorage         ← 依赖 PanGateConstants
17. controller/pangate/PanGateBindings        ← 依赖 PanGateConstants + PanGateStorage + ShortcutFormatter + Strings
18. controller/PanGateController              ← 依赖 pangate/* + ShortcutFormatter + Strings
19. controller/pangate/PanGesturePool         ← 依赖 UIViewTree
20. controller/pangate/EventInterceptor       ← 依赖 PanGesturePool + PanGateController + DocumentScrollController
21. utils/NativeSerializer                       ← 依赖 CanvasToolController
22. ui/components/base/Card                      ← 无业务依赖
23. ui/components/base/KeyBadge                  ← 无业务依赖
24. ui/components/base/KVRow                     ← 无业务依赖
25. ui/components/shortcuts/BindingRow           ← 依赖 Card + KeyBadge
26. ui/components/shortcuts/SectionHeader        ← 依赖 Card + Strings
27. ui/components/shortcuts/EditorModal          ← 依赖 Card + Strings + ShortcutFormatter
28. ui/components/debug/ToolRow                  ← 依赖 KVRow + Strings
29. ui/components/debug/InfoSection              ← 依赖 KVRow + Strings
30. ui/views/PanelView                           ← 依赖 Card + Strings
31. ui/views/ShortcutsPaneView                   ← 无额外依赖
32. ui/views/DebugPaneView                       ← 依赖 Strings
33. ui/containers/ShortcutEditorContainer        ← 依赖 EditorModal + ShortcutController + ShortcutConstants + PanGateController
34. ui/containers/ShortcutsContainer             ← 依赖 ShortcutsPaneView + BindingRow + SectionHeader + ShortcutEditorContainer + PanGateController
35. ui/containers/DebugContainer                 ← 依赖 DebugPaneView + ToolRow + InfoSection + NativeSerializer + PanGateController
36. ui/containers/PanelContainer                 ← 依赖 PanelView + ShortcutsContainer + DebugContainer
37. feature/composeAddonMethods ← 无业务依赖，纯工具函数
38. feature/lifecycleFeature  ← 依赖 ShortcutController + ToolWatcher + createPanelContainer + PanGateController + EventInterceptor + Strings
39. feature/shortcutFeature   ← 依赖 ToolWatcher + ShortcutController + CanvasToolController + ActionProcessor + PanGateController
40. feature/panelEventFeature ← 依赖 ToolWatcher + ShortcutController + PanGateController + EventInterceptor
41. feature/documentPanDebugFeature ← 依赖 DocumentScrollController
42. MNStylusFlowAddon         ← 依赖所有 feature/*，唯一调用 JSB.defineClass 处
```

---

## 核心编程模式

### 1. 全局模块（IIFE）

全局 IIFE 模块统一用 `const` 声明（不可重新赋值，与 `ShortcutConstants` 等 controller 层保持一致）：

```js
const MyModule = (function () {
  // 私有状态和函数
  function privateHelper() { ... }

  return {
    publicMethod: function () { ... },
  };
})();
```

### 2. 工厂函数（有状态子模块）

需要实例化状态的模块用工厂函数（不自执行），由调用方持有实例：

```js
function createMyHandler(dep1, dep2, onCallback) {
  var _state = ...;
  function doSomething() { ... onCallback(); }
  return { doSomething };
}
// 调用方：var handler = createMyHandler(...);
```
目前使用工厂函数的：`createShortcutEditorContainer`、`createShortcutsContainer`、`createDebugContainer`、`createPanelContainer`、`createMNStylusFlowAddon`。

### 3. Feature 组合（JSExtension 方法分组）

`JSB.defineClass` 的方法对象通过 `composeAddonMethods` 由多个 feature factory 组装而成，每个 feature 只关注一个关注点，返回方法片段：

```js
// feature/myFeature.js
function myFeature(ctx) {
  return {
    onSomething: function () { ... ctx.panel ... },
  };
}

// MNStylusFlowAddon.js
function createMNStylusFlowAddon(mainPath) {
  var ctx = { panel: null, shortcutState: { ... } };
  return JSB.defineClass('MNStylusFlowAddon : JSExtension',
    composeAddonMethods([
      lifecycleFeature(ctx, mainPath),
      shortcutFeature(ctx),
      panelEventFeature(ctx),
      myFeature(ctx),          // 新增特性：只需加一行
    ])
  );
}
```

**注意**：feature 方法内可以使用 `self`（JSB 执行时注入），但不能在 feature factory 的函数体执行期（非返回方法内）读取 `self`。

### 4. UI 三层结构

```
components/   纯视图构建，无状态，可复用
              base/       原子（Card / KeyBadge / KVRow）
              shortcuts/  快捷键域分子（BindingRow / SectionHeader / EditorModal）
              debug/      debug 域分子（ToolRow / InfoSection）

views/        Tab 级 UI 骨架，组合 components，返回 view 引用，不挂事件
              PanelView / ShortcutsPaneView / DebugPaneView

containers/   状态协调，驱动 views/components 渲染，消费 controller API
              PanelContainer / ShortcutsContainer / ShortcutEditorContainer / DebugContainer
```

原则：事件绑定只在 containers 层；views 和 components 只做构建，不知道 addon 的存在。

### 5. i18n

```js
// ❌ 禁止硬编码
button.setTitleForState('保存', 0);

// ✅ 正确
button.setTitleForState(Strings.editor.save, 0);
```

所有字符串统一在 `src/i18n/strings.js` 的 `Strings` 对象中，按 `actions / editor / validation / panel / debug / errors / addon` 分组。

---

## 任务导向索引

| 你要做什么 | 去改哪里 |
|-----------|---------|
| 添加新快捷键动作 | `ShortcutConstants.js`（ACTIONS）+ `strings.js`（名称）+ `ShortcutBindings.js`（逻辑） |
| 修改快捷键绑定行 UI | `ui/components/shortcuts/BindingRow.js` |
| 修改编辑 Modal UI | `ui/components/shortcuts/EditorModal.js` |
| 修改编辑器保存/清除逻辑 | `ui/containers/ShortcutEditorContainer.js` |
| 修改 Debug 信息字段 UI | `ui/components/debug/InfoSection.js` |
| 修改 Debug 数据构建逻辑 | `ui/containers/DebugContainer.js`（buildData 函数）|
| 修改面板布局/尺寸 | `ui/views/PanelView.js`（PANEL_W/PANEL_H 常量在此）|
| 修改工具切换逻辑 | `core/ActionProcessor.js` |
| 修改工具状态轮询频率 | `core/ToolWatcher.js`（syncIntervalMs） |
| 修改持久化存储 key | `controller/shortcut/ShortcutStorage.js`（STORAGE_KEY） |
| 添加新面板标签页 | `ui/views/PanelView.js`（Strings.panel.tabs）+ `ui/containers/PanelContainer.js` |
| 添加新 JSExtension 特性块 | 新建 `feature/xxxFeature.js` + 在 `main.js` 加 require + 在 `MNStylusFlowAddon.js` 的数组中追加 |
| 修改用户可见文字 | `src/i18n/strings.js` |

---

## 关键全局对象 API（快速查找）

```
ShortcutController.applyCustomBinding(actionId, input, flags) → {ok, reason, display}
ShortcutController.clearBindingWithRecord(actionId) → bool
ShortcutController.resolveAction(command, keyFlags) → actionId | null
ShortcutController.getAdditionalShortcutKeys() → [{input, flags, title}]
ShortcutController.getBindingLabelMap() → {actionId: displayString}
ShortcutController.syncToolCount(n) → bool (true = changed)
ShortcutController.getDebugState() → debugStateObject

CanvasToolController.find(rootWindow) → pickerView | null
CanvasToolController.detectAllTools(picker) → [{slotIndex, view}]
CanvasToolController.activate(toolView) → bool

DocumentScrollController.panStudyView(studyController, dx, dy) → bool
DocumentScrollController.findScrollTarget(studyController) → scrollView | null
DocumentScrollController.pan(scrollView, dx, dy) → bool
DocumentScrollController.debugProbe(studyController) → {visited, matches, bestName}
DocumentScrollController.DEFAULT_PAN_STEP → 40

PanGateBindings.matchesTrigger(ni, nf) → bool  (预归一化热路径匹配)
PanGateBindings.matchesStop(ni, nf) → bool
PanGateBindings.getTriggerBinding() → {input, flags, display}
PanGateBindings.getStopBinding() → {input, flags, display} | null
PanGateBindings.getExpiredMs() → number
PanGateBindings.applyTriggerBinding(input, flags) → {ok, reason?, display?}
PanGateBindings.applyStopBinding(input, flags) → {ok, reason?, display?}
PanGateBindings.clearStop() / resetTriggerBinding() / resetExpiredMs() / setExpiredMs(v)
PanGateBindings.finishCapture(input, flags, target) → void  (由 PanGateController 内部调用)
PanGateBindings.init() / resetConfig()

PanGateController.isActive() → bool  (心跳门控：热路径，被 EventInterceptor 频繁调用)
PanGateController.heartbeat() / forceExpire()
PanGateController.queryKey(input, flags) → QUERY_RESULT | null
PanGateController.processKey(input, flags) → 'trigger' | 'stop' | 'capture' | null
PanGateController.startCapture(target) / cancelCapture() / isCaptureMode()
PanGateController.getDebugState() → {isActive, expiredMs, triggerLabel, stopLabel, captureTarget}
PanGateController.init() / resetConfig()
(其余配置 API 委托给 PanGateBindings，调用方无需区分)

EventInterceptor.start(addon) → bool  (attach PanGestureRecognizer to all MbUIBookView)
EventInterceptor.ensure(addon) → bool  (start 或 refresh，忽略 desiredActive=false 状态)
EventInterceptor.stop() → void
EventInterceptor.refresh() → void  (detect and attach to newly added MbUIBookView)
EventInterceptor.syncGate() → void  (根据 PanGateController.isActive() 同步 recognizer enabled)
EventInterceptor.handlePan(recognizer) → void
EventInterceptor.isActive() → bool

UIViewTree.findNodeByClass(root, className) → view | null
UIViewTree.findAllNodesByClass(root, className) → [view]
UIViewTree.collectVisibleActionControls(root, maxDepth) → [view]
UIViewTree.clearSubviews(view) → void
UIViewTree.isVisible(view) → bool
UIViewTree.getClassName(obj) → string
UIViewTree.getAbsoluteX(view, container) → number

ToolWatcher.watch(windowRef, force, allowRefresh) → {changed, bindingListChanged, signatureChanged}
ToolWatcher.reset()

ActionProcessor.process(actionId, picker, state) → {handled, reason, slotIndex, bindingListChanged}
```
