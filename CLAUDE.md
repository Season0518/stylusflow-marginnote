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
| 想写 UI 结构 | 写进对应 `*View.js`，不要放进逻辑文件 |
| 文件超过 150 行 | 拆分，见下面架构模式 |
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
│   └── panelEventFeature.js   ← 所有 on* 面板事件委托
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
│   ├── CanvasToolController.js          ← 定位 CanvasToolPicker，激活工具（依赖 UIViewTree）
│   ├── ShortcutController.js            ← 快捷键公共 API 门面（统一入口）
│   └── shortcut/
│       ├── ShortcutConstants.js         ← FLAGS / ACTIONS 常量 + toolActionTitle()
│       ├── ShortcutFormatter.js         ← 输入规范化 + 显示格式化
│       ├── ShortcutStorage.js           ← NSUserDefaults 持久化
│       ├── ShortcutBindings.js          ← 绑定注册表 + 冲突检测 + 反向查找（最大文件 213行）
│       └── ShortcutRuntime.js           ← Debug 运行时状态（触发次数/最近动作等）
│
└── ui/
    ├── NativeSerializer.js              ← 原生对象序列化（用于 debug 展示）
    ├── ToolPickerView.js    ← [VIEW] 面板容器/标签栏 UI 结构 + 布局工具函数
    ├── ToolPickerPanel.js   ← [LOGIC] 面板协调（挂载/拖拽/扫描/标签切换）
    └── panel/
        ├── ShortcutsPane.js             ← [LOGIC] 快捷键面板协调器
        ├── DebugPane.js                 ← [LOGIC] Debug 面板数据/刷新
        ├── shortcut/
        │   ├── ShortcutRowBuilder.js    ← [VIEW] 绑定行 UI 构建
        │   ├── ShortcutEditorView.js    ← [VIEW] 编辑 Modal UI 构建
        │   └── ShortcutEditorHandler.js ← [LOGIC] 编辑器状态管理（工厂函数）
        └── debug/
            └── DebugView.js             ← [VIEW] Debug 面板 UI 构建
```

---

## 模块加载顺序（main.js）

**加载顺序即依赖顺序**，不可调换（JSB.require 进入全局作用域）：

```
1.  i18n/strings              ← 最先，所有模块都可能用到
2.  core/UIViewTree           ← 工具函数，CanvasToolController 依赖
3.  controller/CanvasToolController
4.  controller/shortcut/ShortcutConstants
5.  controller/shortcut/ShortcutFormatter  ← 依赖 ShortcutConstants
6.  controller/shortcut/ShortcutStorage    ← 依赖 ShortcutConstants
7.  controller/shortcut/ShortcutBindings   ← 依赖 Constants+Formatter+Storage
8.  controller/shortcut/ShortcutRuntime    ← 依赖 Constants+Formatter
9.  controller/ShortcutController          ← 依赖所有 shortcut/* 子模块
10. core/ToolWatcher          ← 依赖 CanvasToolController + ShortcutController
11. core/ActionProcessor      ← 依赖 CanvasToolController + ShortcutController + Strings
12. ui/NativeSerializer       ← 依赖 CanvasToolController
13. ui/panel/shortcut/ShortcutRowBuilder   ← 依赖 Strings
14. ui/panel/shortcut/ShortcutEditorView   ← 依赖 Strings + ShortcutFormatter
15. ui/panel/shortcut/ShortcutEditorHandler← 依赖 ShortcutController + ShortcutEditorView
16. ui/panel/ShortcutsPane    ← 依赖上面三个 + ShortcutController + ShortcutConstants
17. ui/panel/debug/DebugView  ← 依赖 Strings
18. ui/panel/DebugPane        ← 依赖 DebugView + Strings
19. ui/ToolPickerView         ← 依赖 Strings
20. ui/ToolPickerPanel        ← 依赖所有 UI 模块 + Controller + NativeSerializer
21. feature/composeAddonMethods ← 无业务依赖，纯工具函数
22. feature/lifecycleFeature  ← 依赖 ShortcutController + ToolWatcher + createToolPickerPanel + Strings
23. feature/shortcutFeature   ← 依赖 ToolWatcher + ShortcutController + CanvasToolController + ActionProcessor
24. feature/panelEventFeature ← 依赖 ToolWatcher + ShortcutController
25. MNStylusFlowAddon         ← 依赖所有 feature/*，唯一调用 JSB.defineClass 处
```

---

## 核心编程模式

### 1. 全局模块（IIFE）

大多数模块用 IIFE 暴露全局对象：

```js
var MyModule = (function () {
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
目前使用工厂函数的：`createShortcutEditorHandler`、`createShortcutsPane`、`createDebugPane`、`createToolPickerPanel`、`createMNStylusFlowAddon`。

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

### 4. View / Logic 分离

- **`*View.js`**：只创建 UIView/UILabel/UIButton，返回引用，不含业务逻辑
- **`*Pane.js` / `*Handler.js`**：持有状态，处理事件，调用 `*View.js` 构建视图

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
| 修改快捷键绑定 UI | `ShortcutRowBuilder.js`（行）或 `ShortcutEditorView.js`（Modal）|
| 修改编辑器保存/清除逻辑 | `ShortcutEditorHandler.js` |
| 修改 Debug 面板显示的字段 | `DebugView.js`（UI）+ `DebugPane.js`（数据）|
| 修改面板布局/尺寸 | `ToolPickerView.js`（PANEL_W/PANEL_H 常量在此）|
| 修改工具切换逻辑 | `ActionProcessor.js` |
| 修改工具状态轮询频率 | `ToolWatcher.js`（syncIntervalMs） |
| 修改持久化存储 key | `ShortcutStorage.js`（STORAGE_KEY） |
| 添加新面板标签页 | `ToolPickerView.js`（Strings.panel.tabs）+ `ToolPickerPanel.js` |
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

UIViewTree.findNodeByClass(root, className) → view | null
UIViewTree.collectVisibleActionControls(root, maxDepth) → [view]
UIViewTree.isVisible(view) → bool
UIViewTree.getClassName(obj) → string

ToolWatcher.watch(windowRef, force, allowRefresh, panel) → {changed, bindingListChanged, signatureChanged}
ToolWatcher.reset()

ActionProcessor.process(actionId, picker, state) → {handled, reason, slotIndex, bindingListChanged}
```
