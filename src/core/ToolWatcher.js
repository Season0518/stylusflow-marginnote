// 负责工具状态的定时轮询与变化检测
var ToolWatcher = (function () {
  var _state = {
    lastSyncAt: 0,
    syncIntervalMs: 450,
    lastSignature: '',
  };

  function buildSignature(tools) {
    if (!tools || !tools.length) return '0';
    var parts = [];
    for (var i = 0; i < tools.length; i++) {
      var t = tools[i];
      parts.push(String(t.slotIndex) + ':' + CanvasToolController.tryGetClassName(t.view));
    }
    return parts.join('|');
  }

  // windowRef: addon.window; force: 是否跳过节流; allowRefresh: 是否允许触发刷新命令; panel: 面板实例
  function watch(windowRef, force, allowRefresh, panel) {
    var now = Date.now();
    if (!force && now - _state.lastSyncAt < _state.syncIntervalMs) {
      return { changed: false, bindingListChanged: false, signatureChanged: false };
    }
    _state.lastSyncAt = now;

    var app = Application.sharedInstance();
    var sc = app.studyController(windowRef);
    if (!sc || !sc.view) {
      var changed = ShortcutController.syncToolCount(0);
      if (changed && allowRefresh && sc) sc.refreshAddonCommands();
      if (panel && panel.isMounted() && changed) panel.refreshShortcutBindings();
      return { changed: changed, bindingListChanged: changed, signatureChanged: false };
    }

    var picker = CanvasToolController.find(sc.view);
    var tools = picker ? CanvasToolController.detectAllTools(picker) : [];
    var bindingListChanged = ShortcutController.syncToolCount(tools.length);
    var signature = buildSignature(tools);
    var signatureChanged = signature !== _state.lastSignature;
    _state.lastSignature = signature;

    if (bindingListChanged && allowRefresh) sc.refreshAddonCommands();
    if (panel && panel.isMounted()) {
      if (bindingListChanged) panel.refreshShortcutBindings();
      if (bindingListChanged || signatureChanged) panel.refreshDebug();
    }

    return {
      changed: bindingListChanged || signatureChanged,
      bindingListChanged: bindingListChanged,
      signatureChanged: signatureChanged,
    };
  }

  function reset() {
    _state.lastSignature = '';
    _state.lastSyncAt = 0;
  }

  return { watch: watch, reset: reset };
})();
