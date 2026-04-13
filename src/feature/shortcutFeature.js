function shortcutFeature(ctx) {
  function ensurePanAutoState() {
    if (ctx.panAutoSelectState) return ctx.panAutoSelectState;
    ctx.panAutoSelectState = { active: false, restoreSlot: -1 };
    return ctx.panAutoSelectState;
  }

  function getPickerTools() {
    var app = Application.sharedInstance();
    var sc = app.studyController(self.window);
    var picker = sc && sc.view ? CanvasToolController.find(sc.view) : null;
    var tools = picker ? CanvasToolController.detectAllTools(picker) : [];
    return { sc: sc, picker: picker, tools: tools };
  }

  function activateToolBySlot(slot, info) {
    if (!info || !info.tools || slot < 0 || slot >= info.tools.length) return false;
    var target = info.tools[slot];
    if (!target || !target.view) return false;
    if (!CanvasToolController.activate(target.view)) return false;
    ctx.shortcutState.lastToolSlot = slot;
    ctx.shortcutState.lastToolClass = CanvasToolController.tryGetClassName(target.view);
    return true;
  }

  function applyPanAutoSelectOnTrigger() {
    if (!PanGateController.isAutoSelectToolEnabled()) return;
    var state = ensurePanAutoState();
    var info = getPickerTools();
    if (!info.picker || !info.tools.length) return;

    var activeSlot = CanvasToolController.detectActiveSlot(info.picker);
    if (activeSlot < 0 && typeof ctx.shortcutState.lastToolSlot === 'number') {
      activeSlot = ctx.shortcutState.lastToolSlot;
    }
    if (!state.active) state.restoreSlot = activeSlot;

    var selectSlot = info.tools.length - 1;
    if (selectSlot >= 0) {
      activateToolBySlot(selectSlot, info);
      state.active = true;
    }
  }

  function restoreToolAfterPan() {
    var state = ensurePanAutoState();
    if (!state.active) return;

    var restoreSlot = state.restoreSlot;
    state.active = false;
    state.restoreSlot = -1;

    var info = getPickerTools();
    if (!info.picker || !info.tools.length) return;
    if (restoreSlot < 0 || restoreSlot >= info.tools.length) return;
    activateToolBySlot(restoreSlot, info);
  }

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
          restoreToolAfterPan();
        } else if (panAction === 'trigger') {
          EventInterceptor.clearSoftStop();
          PanGateHttpSignal.notifySpace(command, keyFlags, self.window);
          applyPanAutoSelectOnTrigger();
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
