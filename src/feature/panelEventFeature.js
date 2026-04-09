function panelEventFeature(ctx) {
  var DEBUG_TAB_INDEX = 1;
  return {
    onPanelClose: function () {
      if (!ctx.panel) return;
      ctx.panel.unmount();
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
    onPanelPan: function (recognizer) { if (ctx.panel) ctx.panel.handlePan(recognizer); },
    onTabSwitch: function (sender) {
      if (!ctx.panel) return;
      ctx.panel.switchTab(sender.tag);
      if (sender.tag === DEBUG_TAB_INDEX) ctx.panel.refreshDebug();
    },
    onScanTools: function () {
      var r = ToolWatcher.watch(self.window, true, true);
      if (ctx.panel && ctx.panel.isMounted()) {
        if (r.bindingListChanged) ctx.panel.refreshShortcutBindings();
        if (r.bindingListChanged || r.signatureChanged) ctx.panel.refreshDebug();
      }
      if (ctx.panel) ctx.panel.scan();
    },
    onResetAddonConfig: function () {
      if (!ShortcutController.clearAllPersistedConfig()) return;
      ShortcutController.restorePersistedBindings();
      PanGateController.resetConfig();
      EventInterceptor.syncGate();
      if (ctx.panel) { ctx.panel.refreshShortcutBindings(); ctx.panel.refreshDebug(); }
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
    onActivateTool: function (sender) { if (ctx.panel) ctx.panel.activateTool(sender.tag); },
    onDebugToggle: function (sender) { if (ctx.panel) ctx.panel.toggleDebugItem(sender.tag); },
    onToggleEventIntercept: function () {
      if (!ctx.panel) return;
      console.log('[StylusFlow][Debug] 点击事件拦截按钮');
      ctx.panel.toggleEventIntercept();
      ctx.panel.refreshDebug();
    },
    onInterceptPan: function (recognizer) { EventInterceptor.handlePan(recognizer); },
    onToggleDirectToolsTab: function () { if (ctx.panel) ctx.panel.toggleDirectToolsTab(); },
    onShortcutBindingTap: function (sender) { if (ctx.panel) ctx.panel.handleShortcutBindingTap(sender.tag); },
    onShortcutEditorModifierTap: function (sender) { if (ctx.panel) ctx.panel.handleShortcutEditorModifierTap(sender.tag); },
    onShortcutEditorCancel: function () { if (ctx.panel) ctx.panel.handleShortcutEditorCancel(); },
    onShortcutEditorClear: function () {
      if (!ctx.panel || !ctx.panel.handleShortcutEditorClear()) return;
      ctx.panel.refreshShortcutBindings();
      ctx.panel.refreshDebug();
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
    onShortcutEditorSave: function () {
      if (!ctx.panel || !ctx.panel.handleShortcutEditorSave()) return;
      ctx.panel.refreshShortcutBindings();
      ctx.panel.refreshDebug();
      var sc = Application.sharedInstance().studyController(self.window);
      if (sc) sc.refreshAddonCommands();
    },
  };
}
