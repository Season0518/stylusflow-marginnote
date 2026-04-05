function createMNStylusFlowAddon(mainPath) {
  var DEBUG_TAB_INDEX = 1;
  var _panel = null;
  var _shortcutState = {
    lastToolSlot: -1,
    lastToolClass: '',
  };
  var _toolWatchState = {
    lastSyncAt: 0,
    syncIntervalMs: 450,
    lastSignature: '',
  };

  function buildToolSignature(tools) {
    if (!tools || !tools.length) return '0';
    var parts = [];
    for (var i = 0; i < tools.length; i++) {
      var tool = tools[i];
      parts.push(String(tool.slotIndex) + ':' + CanvasToolController.tryGetClassName(tool.view));
    }
    return parts.join('|');
  }

  function watchToolState(windowRef, force, allowRefresh) {
    var now = Date.now();
    if (!force && now - _toolWatchState.lastSyncAt < _toolWatchState.syncIntervalMs) {
      return { changed: false, bindingListChanged: false, signatureChanged: false };
    }
    _toolWatchState.lastSyncAt = now;

    var app = Application.sharedInstance();
    var sc = app.studyController(windowRef);
    if (!sc || !sc.view) {
      var changedWhenMissing = ShortcutController.syncToolCount(0);
      if (changedWhenMissing && allowRefresh && sc) sc.refreshAddonCommands();
      if (_panel && _panel.isMounted() && changedWhenMissing) _panel.refreshShortcutBindings();
      return { changed: changedWhenMissing, bindingListChanged: changedWhenMissing, signatureChanged: false };
    }

    var picker = CanvasToolController.find(sc.view);
    var tools = picker ? CanvasToolController.detectAllTools(picker) : [];
    var bindingListChanged = ShortcutController.syncToolCount(tools.length);
    var signature = buildToolSignature(tools);
    var signatureChanged = signature !== _toolWatchState.lastSignature;
    _toolWatchState.lastSignature = signature;

    if (bindingListChanged && allowRefresh) sc.refreshAddonCommands();
    if (_panel && _panel.isMounted()) {
      if (bindingListChanged) _panel.refreshShortcutBindings();
      if (bindingListChanged || signatureChanged) _panel.refreshDebug();
    }

    return {
      changed: bindingListChanged || signatureChanged,
      bindingListChanged,
      signatureChanged,
    };
  }

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
        ShortcutController.restorePersistedBindings();
        _panel = createToolPickerPanel(self);
        watchToolState(self.window, true, true);
        if (_panel) _panel.refreshShortcutBindings();
        console.log("[StylusFlow] initialized");
      },
      sceneDidDisconnect: function () {
        if (_panel) _panel.unmount();
        _panel = null;
        _toolWatchState.lastSignature = '';
        console.log("[StylusFlow] disconnected");
      },
      controllerWillLayoutSubviews: function (controller) {
        var app = Application.sharedInstance();
        var sc = app.studyController(self.window);
        if (controller === sc) watchToolState(self.window, false, true);
        if (!_panel || !_panel.isMounted()) return;
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
        watchToolState(self.window, false, false);
        return ShortcutController.getAdditionalShortcutKeys();
      },
      queryShortcutKeyWithKeyFlags: function (command, keyFlags) {
        return ShortcutController.queryShortcut(command, keyFlags);
      },
      processShortcutKeyWithKeyFlags: function (command, keyFlags) {
        watchToolState(self.window, false, true);
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
          watchToolState(self.window, true, true);
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
        watchToolState(self.window, true, true);
        if (_panel) _panel.scan();
      },
      onResetAddonConfig: function () {
        var ok = ShortcutController.clearAllPersistedConfig();
        if (!ok) return;

        ShortcutController.clearRuntimeBindings();
        ShortcutController.restorePersistedBindings();

        if (_panel) {
          _panel.refreshShortcutBindings();
          _panel.refreshDebug();
        }

        var app = Application.sharedInstance();
        var sc = app.studyController(self.window);
        if (sc) sc.refreshAddonCommands();
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
