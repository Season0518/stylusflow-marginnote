function shortcutFeature(ctx) {
  function dedupeCommands(commands) {
    var out = [];
    var seen = {};
    for (var i = 0; i < commands.length; i++) {
      var item = commands[i];
      if (!item) continue;
      var key = String(item.input) + '__' + String(item.flags || 0);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(item);
    }
    return out;
  }

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
      return dedupeCommands(
        PanGateController.getAdditionalShortcutKeys().concat(ShortcutController.getAdditionalShortcutKeys())
      );
    },
    queryShortcutKeyWithKeyFlags: function (command, keyFlags) {
      var ni = ShortcutFormatter.normalizeInput(command);
      var nf = ShortcutFormatter.normalizeFlags(keyFlags);
      if (PanGateController.queryKeyNormalized(ni, nf) || ShortcutRegistry.resolve(ni, nf)) {
        return PanGateConstants.QUERY_RESULT;
      }
      return null;
    },
    processShortcutKeyWithKeyFlags: function (command, keyFlags) {
      ToolWatcher.watch(self.window, false, true);
      var panAction = PanGateController.processKey(command, keyFlags);
      if (panAction) {
        if (panAction === 'stop') {
          PanGateHttpSignal.reset('stop');
          EventInterceptor.armSoftStop();
        } else if (panAction === 'trigger') {
          EventInterceptor.clearSoftStop();
          PanGateHttpSignal.notifySpace(command, keyFlags, self.window);
        } else if (panAction === 'capture') {
          PanGateHttpSignal.reset('capture');
        }
        EventInterceptor.syncGate();
        if (typeof MindMapBoxSelectController !== 'undefined') MindMapBoxSelectController.syncPanGate('shortcut.' + panAction);
        if (ctx.panel && ctx.panel.isMounted()) ctx.panel.refreshDebug();
        if (panAction === 'capture') {
          var sc0 = Application.sharedInstance().studyController(self.window);
          if (sc0) sc0.refreshAddonCommands();
        }
        return true;
      }

      var ni = ShortcutFormatter.normalizeInput(command);
      var nf = ShortcutFormatter.normalizeFlags(keyFlags);
      if (PanGateBindings.matchesStop(ni, nf)) {
        EventInterceptor.armSoftStop();
        EventInterceptor.syncGate();
      }

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
