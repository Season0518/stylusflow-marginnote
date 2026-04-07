function lifecycleFeature(ctx, mainPath) {
  return {
    sceneWillConnect: function () {
      self.mainPath = mainPath;
      ShortcutController.restorePersistedBindings();
      ctx.panel = createToolPickerPanel(self);
      ToolWatcher.watch(self.window, true, true, ctx.panel);
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
      if (controller === sc) ToolWatcher.watch(self.window, false, true, ctx.panel);
      if (!ctx.panel || !ctx.panel.isMounted()) return;
      if (controller === sc && sc && sc.view) ctx.panel.relayoutWithinBounds(sc.view.bounds);
    },
  };
}
