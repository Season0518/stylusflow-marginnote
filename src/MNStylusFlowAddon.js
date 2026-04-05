function createMNStylusFlowAddon(mainPath) {
  var DEBUG_TAB_INDEX = 1;
  var _panel = null;
  var _shortcutState = {
    lastToolSlot: -1,
    lastToolClass: '',
  };

  function resolveTargetSlot(actionId, tools, state) {
    if (!tools || !tools.length) return -1;
    var ACTIONS = ShortcutController.ACTIONS;
    if (actionId === ACTIONS.PREV_TOOL || actionId === ACTIONS.NEXT_TOOL) {
      var current = (typeof state.lastToolSlot === 'number' && state.lastToolSlot >= 0)
        ? state.lastToolSlot : 0;
      var delta = actionId === ACTIONS.NEXT_TOOL ? 1 : -1;
      return (current + delta + tools.length) % tools.length;
    }
    if (actionId && actionId.startsWith('tool.')) {
      var slot = parseInt(actionId.slice(5), 10) - 1;
      if (!isNaN(slot) && slot >= 0 && slot < tools.length) return slot;
    }
    return -1;
  }

  function processAction(actionId, picker, state) {
    var ctx = state || {};
    if (!picker) {
      var changedWhenMissing = ShortcutController.syncToolCount(0);
      return { handled: false, reason: '未找到工具栏', bindingListChanged: changedWhenMissing };
    }
    var tools = CanvasToolController.detectAllTools(picker);
    var bindingListChanged = ShortcutController.syncToolCount(tools.length);
    if (!tools.length) return { handled: false, reason: '未找到可切换工具', bindingListChanged };
    var slotIndex = resolveTargetSlot(actionId, tools, ctx);
    if (slotIndex < 0 || slotIndex >= tools.length) return { handled: false, reason: '未匹配到目标工具', bindingListChanged };
    var target = tools[slotIndex];
    if (!target || !target.view) return { handled: false, reason: '目标工具不可用', bindingListChanged };
    if (!CanvasToolController.activate(target.view)) return { handled: false, reason: '工具激活失败', bindingListChanged };
    ctx.lastToolSlot = slotIndex;
    ctx.lastToolClass = CanvasToolController.tryGetClassName(target.view);
    return {
      handled: true,
      reason: '已执行',
      slotIndex,
      className: ctx.lastToolClass,
      toolCount: tools.length,
      bindingListChanged,
    };
  }

  return JSB.defineClass(
    "MNStylusFlowAddon : JSExtension",
    {
      sceneWillConnect: function () {
        self.mainPath = mainPath;
        ShortcutController.bindDefaultShortcuts();
        _panel = createToolPickerPanel(self);
        if (_panel) _panel.refreshShortcutBindings();
        console.log("[StylusFlow] initialized");
      },
      sceneDidDisconnect: function () {
        if (_panel) _panel.unmount();
        _panel = null;
        console.log("[StylusFlow] disconnected");
      },
      controllerWillLayoutSubviews: function (controller) {
        if (!_panel || !_panel.isMounted()) return;
        var app = Application.sharedInstance();
        var sc = app.studyController(self.window);
        if (controller === sc && sc && sc.view) {
          _panel.relayoutWithinBounds(sc.view.bounds);
        }
      },
      queryAddonCommandStatus: function () {
        return {
          image: "icon.png",
          object: self,
          selector: "togglePanel:",
          checked: !!(_panel && _panel.isMounted()),
        };
      },
      additionalShortcutKeys: function () {
        return ShortcutController.getAdditionalShortcutKeys();
      },
      queryShortcutKeyWithKeyFlags: function (command, keyFlags) {
        return ShortcutController.queryShortcut(command, keyFlags);
      },
      processShortcutKeyWithKeyFlags: function (command, keyFlags) {
        var actionId = ShortcutController.resolveAction(command, keyFlags);
        if (!actionId) return false;

        var app = Application.sharedInstance();
        var sc = app.studyController(self.window);
        var picker = sc && sc.view ? CanvasToolController.find(sc.view) : null;
        var result = processAction(actionId, picker, _shortcutState);

        ShortcutController.recordProcessResult(actionId, command, keyFlags, result);
        if (result && result.bindingListChanged && sc) sc.refreshAddonCommands();
        if (_panel && _panel.isMounted()) {
          if (result && result.bindingListChanged) _panel.refreshShortcutBindings();
          _panel.refreshDebug();
        }

        return !!(result && result.handled);
      },
      togglePanel: function () {
        if (!_panel) return;
        var app = Application.sharedInstance();
        var sc = app.studyController(self.window);
        if (_panel.isMounted()) {
          _panel.unmount();
        } else if (sc && sc.view) {
          _panel.mount(sc.view);
          _panel.relayoutWithinBounds(sc.view.bounds);
        }
        if (sc) sc.refreshAddonCommands();
      },
      onPanelClose: function () {
        if (!_panel) return;
        _panel.unmount();
        var app = Application.sharedInstance();
        var sc = app.studyController(self.window);
        if (sc) sc.refreshAddonCommands();
      },
      onPanelPan: function (recognizer) {
        if (_panel) _panel.handlePan(recognizer);
      },
      onTabSwitch: function (sender) {
        if (!_panel) return;
        _panel.switchTab(sender.tag);
        if (sender.tag === DEBUG_TAB_INDEX) _panel.refreshDebug();
      },
      onScanTools: function () {
        if (_panel) _panel.scan();
      },
      onActivateTool: function (sender) {
        if (_panel) _panel.activateTool(sender.tag);
      },
      onDebugToggle: function (sender) {
        if (_panel) _panel.toggleDebugItem(sender.tag);
      },
      onToggleDirectToolsTab: function () {
        if (_panel) _panel.toggleDirectToolsTab();
      },
      onShortcutBindingTap: function (sender) {
        if (!_panel) return;
        _panel.handleShortcutBindingTap(sender.tag);
      },
      onShortcutEditorModifierTap: function (sender) {
        if (!_panel) return;
        _panel.handleShortcutEditorModifierTap(sender.tag);
      },
      onShortcutEditorCancel: function () {
        if (!_panel) return;
        _panel.handleShortcutEditorCancel();
      },
      onShortcutEditorClear: function () {
        if (!_panel) return;
        if (_panel.handleShortcutEditorClear()) {
          _panel.refreshShortcutBindings();
          _panel.refreshDebug();
          var sc = Application.sharedInstance().studyController(self.window);
          if (sc) sc.refreshAddonCommands();
        }
      },
      onShortcutEditorSave: function () {
        if (!_panel) return;
        if (_panel.handleShortcutEditorSave()) {
          _panel.refreshShortcutBindings();
          _panel.refreshDebug();
          var sc = Application.sharedInstance().studyController(self.window);
          if (sc) sc.refreshAddonCommands();
        }
      },
    },
  );
}
