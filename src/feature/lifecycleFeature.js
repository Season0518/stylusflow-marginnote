function lifecycleFeature(ctx, mainPath) {
  return {
    sceneWillConnect: function () {
      self.mainPath = mainPath;
      ShortcutController.restorePersistedBindings();
      PanGateController.init();
      ctx.panel = createPanelContainer(self);
      EventInterceptor.start(self);
      ToolWatcher.watch(self.window, true, true);
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
      }
      if (!ctx.panel || !ctx.panel.isMounted()) return;
      if (controller === sc && sc && sc.view) ctx.panel.relayoutWithinBounds(sc.view.bounds);
    },
  };
}
