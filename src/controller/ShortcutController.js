const ShortcutController = (function () {
  return {
    ACTIONS:                   ShortcutConstants.ACTIONS,
    FLAGS:                     ShortcutConstants.FLAGS,
    applyCustomBinding:        function (actionId, input, flags) {
      var r = ShortcutBindings.applyCustomBinding(actionId, input, flags);
      if (r.ok) ShortcutRuntime.markBindingChanged(actionId, r.display);
      return r;
    },
    clearBindingWithRecord:    function (actionId) {
      var changed = ShortcutBindings.clearBinding(actionId);
      if (changed) ShortcutRuntime.markBindingChanged(actionId, Strings.editor.notSet);
      return changed;
    },
    getDebugState:             function () { return ShortcutRuntime.getDebugState(ShortcutRegistry.getCount()); },
    getBinding:                ShortcutRegistry.get,
    restorePersistedBindings:  ShortcutBindings.restorePersistedBindings,
    getAdditionalShortcutKeys: ShortcutBindings.getAdditionalShortcutKeys,
    resolveAction:             ShortcutBindings.resolveAction,
    queryShortcut:             ShortcutBindings.queryShortcut,
    syncToolCount:             ShortcutBindings.setDynamicToolCount,
    getToolActionIds:          ShortcutBindings.getToolActionIds,
    getBindingLabelMap:        ShortcutBindings.getBindingLabelMap,
    recordProcessResult:       ShortcutRuntime.recordProcessResult,
    clearAllPersistedConfig:   ShortcutStorage.clearAllAddonConfigs,
  };
})();
