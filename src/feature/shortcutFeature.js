function shortcutFeature(ctx) {
  return {
    queryAddonCommandStatus: function () {
      return { image: 'icon.png', object: self, selector: 'togglePanel:', checked: !!(ctx.panel && ctx.panel.isMounted()) };
    },
    additionalShortcutKeys: function () {
      var r = ToolWatcher.watch(self.window, false, false);
      if (ctx.panel && ctx.panel.isMounted()) {
        if (r.bindingListChanged) ctx.panel.refreshShortcutBindings();
        if (r.bindingListChanged || r.signatureChanged) ctx.panel.refreshDebug();
      }
      return ShortcutController.getAdditionalShortcutKeys();
    },
    queryShortcutKeyWithKeyFlags: function (command, keyFlags) {
      return ShortcutController.queryShortcut(command, keyFlags);
    },
    processShortcutKeyWithKeyFlags: function (command, keyFlags) {
      ToolWatcher.watch(self.window, false, true);
      var actionId = ShortcutController.resolveAction(command, keyFlags);
      if (!actionId) return false;

      var app = Application.sharedInstance();
      var sc = app.studyController(self.window);
      var picker = sc && sc.view ? CanvasToolController.find(sc.view) : null;
      var result = ActionProcessor.process(actionId, picker, ctx.shortcutState);

      ShortcutController.recordProcessResult(actionId, command, keyFlags, result);
      if (result && result.bindingListChanged && sc) sc.refreshAddonCommands();
      if (ctx.panel && ctx.panel.isMounted()) {
        if (result && result.bindingListChanged) ctx.panel.refreshShortcutBindings();
        ctx.panel.refreshDebug();
      }
      return !!(result && result.handled);
    },
    togglePanel: function () {
      if (!ctx.panel) return;
      var app = Application.sharedInstance();
      var sc = app.studyController(self.window);
      if (ctx.panel.isMounted()) {
        ctx.panel.unmount();
      } else if (sc && sc.view) {
        ctx.panel.mount(sc.view);
        ctx.panel.relayoutWithinBounds(sc.view.bounds);
        var r = ToolWatcher.watch(self.window, true, true);
        if (ctx.panel && ctx.panel.isMounted()) {
          if (r.bindingListChanged) ctx.panel.refreshShortcutBindings();
          if (r.bindingListChanged || r.signatureChanged) ctx.panel.refreshDebug();
        }
      }
      if (sc) sc.refreshAddonCommands();
    },
  };
}
