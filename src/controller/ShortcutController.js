const ShortcutController = (() => {
  const { toolActionTitle } = ShortcutConstants;
  const { normalizeCustomInput, normalizeFlags, formatShortcutLabel } = ShortcutFormatter;

  function clearBindingWithRecord(actionId) {
    const changed = ShortcutBindings.clearBinding(actionId);
    if (changed) ShortcutRuntime.markBindingChanged(actionId, '未设置');
    return changed;
  }

  function applyCustomBinding(actionId, input, flags) {
    if (!actionId) return { ok: false, reason: '缺少动作标识' };
    const normalizedInput = normalizeCustomInput(input);
    if (!normalizedInput) {
      return { ok: false, reason: '按键无效，请输入单个字符或 Up/Down/Left/Right/Esc' };
    }
    const ok = ShortcutBindings.setBinding(actionId, normalizedInput, flags, toolActionTitle(actionId));
    if (!ok) return { ok: false, reason: '绑定失败' };
    const display = formatShortcutLabel(normalizedInput, normalizeFlags(flags));
    ShortcutRuntime.markBindingChanged(actionId, display);
    return { ok: true, actionId, display };
  }

  function getDebugState() {
    return ShortcutRuntime.getDebugState(ShortcutBindings.getBindingCount());
  }

  function syncToolCount(toolCount) {
    return ShortcutBindings.setDynamicToolCount(toolCount);
  }

  function getToolActionIds() {
    return ShortcutBindings.getToolActionIds();
  }

  function restorePersistedBindings() {
    ShortcutBindings.restorePersistedBindings();
  }

  function clearAllPersistedConfig() {
    return ShortcutStorage.clearAllAddonConfigs();
  }

  function clearRuntimeBindings() {
    ShortcutBindings.clearRuntimeBindings();
  }

  ShortcutBindings.restorePersistedBindings();

  return {
    ACTIONS: ShortcutConstants.ACTIONS,
    FLAGS: ShortcutConstants.FLAGS,
    clearBindingWithRecord,
    getBinding: ShortcutBindings.getBinding,
    applyCustomBinding,
    bindDefaultShortcuts: ShortcutBindings.bindDefaultShortcuts,
    restorePersistedBindings,
    clearAllPersistedConfig,
    clearRuntimeBindings,
    getAdditionalShortcutKeys: ShortcutBindings.getAdditionalShortcutKeys,
    resolveAction: ShortcutBindings.resolveAction,
    queryShortcut: ShortcutBindings.queryShortcut,
    recordProcessResult: ShortcutRuntime.recordProcessResult,
    syncToolCount,
    getToolActionIds,
    getBindingLabelMap: ShortcutBindings.getBindingLabelMap,
    getDebugState,
  };
})();
