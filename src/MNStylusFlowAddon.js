// 插件主入口：生命周期管理、快捷键分发、面板事件委托
function createMNStylusFlowAddon(mainPath) {
  var DEBUG_TAB_INDEX = 1;
  var _panel = null;
  var _shortcutState = { lastToolSlot: -1, lastToolClass: '' };

  function watchToolState(windowRef, force, allowRefresh) {
    return ToolWatcher.watch(windowRef, force, allowRefresh, _panel);
  }

  return JSB.defineClass('MNStylusFlowAddon : JSExtension', {
    sceneWillConnect: function () {
      self.mainPath = mainPath;
      ShortcutController.restorePersistedBindings();
      _panel = createToolPickerPanel(self);
      watchToolState(self.window, true, true);
      if (_panel) _panel.refreshShortcutBindings();
      console.log(Strings.addon.initialized);
    },
    sceneDidDisconnect: function () {
      if (_panel) _panel.unmount();
      _panel = null;
      ToolWatcher.reset();
      console.log(Strings.addon.disconnected);
    },
    controllerWillLayoutSubviews: function (controller) {
      var app = Application.sharedInstance();
      var sc = app.studyController(self.window);
      if (controller === sc) watchToolState(self.window, false, true);
      if (!_panel || !_panel.isMounted()) return;
      if (controller === sc && sc && sc.view) _panel.relayoutWithinBounds(sc.view.bounds);
    },
    queryAddonCommandStatus: function () {
      return { image: 'icon.png', object: self, selector: 'togglePanel:', checked: !!(_panel && _panel.isMounted()) };
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
      var result = ActionProcessor.process(actionId, picker, _shortcutState);

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
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
    onPanelPan: function (recognizer) { if (_panel) _panel.handlePan(recognizer); },
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
      if (!ShortcutController.clearAllPersistedConfig()) return;
      ShortcutController.clearRuntimeBindings();
      ShortcutController.restorePersistedBindings();
      if (_panel) { _panel.refreshShortcutBindings(); _panel.refreshDebug(); }
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
    onActivateTool: function (sender) { if (_panel) _panel.activateTool(sender.tag); },
    onDebugToggle: function (sender) { if (_panel) _panel.toggleDebugItem(sender.tag); },
    onToggleDirectToolsTab: function () { if (_panel) _panel.toggleDirectToolsTab(); },
    onShortcutBindingTap: function (sender) { if (_panel) _panel.handleShortcutBindingTap(sender.tag); },
    onShortcutEditorModifierTap: function (sender) { if (_panel) _panel.handleShortcutEditorModifierTap(sender.tag); },
    onShortcutEditorCancel: function () { if (_panel) _panel.handleShortcutEditorCancel(); },
    onShortcutEditorClear: function () {
      if (!_panel || !_panel.handleShortcutEditorClear()) return;
      _panel.refreshShortcutBindings();
      _panel.refreshDebug();
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
    onShortcutEditorSave: function () {
      if (!_panel || !_panel.handleShortcutEditorSave()) return;
      _panel.refreshShortcutBindings();
      _panel.refreshDebug();
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
  });
}
