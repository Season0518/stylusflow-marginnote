function lifecycleFeature(ctx, mainPath) {
  return {
    sceneWillConnect: function () {
      self.mainPath = mainPath;
      ShortcutController.restorePersistedBindings();
      ctx.panel = createPanelContainer(self);
      ToolWatcher.watch(self.window, true, true);
      if (ctx.panel) ctx.panel.refreshShortcutBindings();
      console.log(Strings.addon.initialized);
    },
    sceneDidDisconnect: function () {
      if (ctx.panel) ctx.panel.unmount();
      ctx.panel = null;
      ToolWatcher.reset();
      console.log(Strings.addon.disconnected);
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
      }
      if (!ctx.panel || !ctx.panel.isMounted()) return;
      if (controller === sc && sc && sc.view) ctx.panel.relayoutWithinBounds(sc.view.bounds);
    },
  };
}
