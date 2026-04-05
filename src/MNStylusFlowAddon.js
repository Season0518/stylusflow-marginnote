function createMNStylusFlowAddon(mainPath) {
  var DEBUG_TAB_INDEX = 1;
  var _panel = null;

  return JSB.defineClass(
    "MNStylusFlowAddon : JSExtension",
    {
      sceneWillConnect: function () {
        self.mainPath = mainPath;
        _panel = createToolPickerPanel(self);
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
    },
  );
}
