function lifecycleFeature(ctx, mainPath) {
  function _ensureBoxSelect(sc) {
    if (typeof MindMapBoxSelectController === 'undefined' || !sc) return;
    if (!MindMapBoxSelectController.getDebugState().modeActive) {
      MindMapBoxSelectController.toggleBoxSelectMode(sc);
    }
  }

  return {
    sceneWillConnect: function () {
      self.mainPath = mainPath;
      ShortcutController.restorePersistedBindings();
      PanGateController.init();
      ctx.panel = createPanelContainer(self);
      EventInterceptor.start(self);
      ToolWatcher.watch(self.window, true, true);
      var app0 = Application.sharedInstance();
      var sc0 = app0.studyController(self.window);
      if (sc0 && sc0.view) {
        var picker0 = CanvasToolController.find(sc0.view);
        var tools0 = CanvasToolController.detectAllTools(picker0);
        if (tools0.length > 0) {
          var last0 = tools0[tools0.length - 1];
          CanvasToolController.activate(last0.view);
          ctx.shortcutState.lastToolSlot = tools0.length - 1;
          ctx.shortcutState.lastToolClass = CanvasToolController.tryGetClassName(last0.view);
        }
        _ensureBoxSelect(sc0);
      }
      if (ctx.panel) ctx.panel.refreshShortcutBindings();
    },
    sceneDidDisconnect: function () {
      if (ctx.panel) ctx.panel.unmount();
      ctx.panel = null;
      ToolWatcher.reset();
      EventInterceptor.stop();
      if (typeof MindMapBoxSelectController !== 'undefined') MindMapBoxSelectController.stopBoxSelectMode();
      PanGateController.forceExpire();
    },
    controllerWillLayoutSubviews: function (controller) {
      var app = Application.sharedInstance();
      var sc = app.studyController(self.window);
      if (controller === sc) {
        var r = ToolWatcher.watch(self.window, false, true);
        if (ctx.panel && ctx.panel.isMounted()) {
          if (r.bindingListChanged) ctx.panel.refreshShortcutBindings();
          if (r.bindingListChanged || r.signatureChanged) ctx.panel.refreshDebug();
        }
        EventInterceptor.ensure(self);
        _ensureBoxSelect(sc);
      }
      if (!ctx.panel || !ctx.panel.isMounted()) return;
      if (controller === sc && sc && sc.view) ctx.panel.relayoutWithinBounds(sc.view.bounds);
    },
  };
}
