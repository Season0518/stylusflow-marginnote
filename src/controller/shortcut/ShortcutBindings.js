// 快捷键编排层：工具数量管理、持久化时机、输出格式化
// 底层存储见 ShortcutRegistry.js
const ShortcutBindings = (function () {
  var _c = ShortcutConstants;
  var _f = ShortcutFormatter;

  var dynamicToolCount = _c.DEFAULT_TOOL_COUNT;
  var cachedOrderedIds = null;

  function _persistBindings() {
    return ShortcutStorage.saveBindings(ShortcutRegistry.exportAll());
  }

  function _rebuildCachedIds() {
    var ids = [_c.ACTIONS.PREV_TOOL, _c.ACTIONS.NEXT_TOOL];
    var count = Math.max(dynamicToolCount, _c.DEFAULT_TOOL_COUNT);
    for (var i = 1; i <= count; i++) ids.push(_c.getToolActionId(i));
    cachedOrderedIds = ids;
    return ids;
  }

  function _getOrderedIds() {
    return cachedOrderedIds || _rebuildCachedIds();
  }

  function getToolActionIds() {
    var ids = [];
    for (var i = 1; i <= dynamicToolCount; i++) ids.push(_c.getToolActionId(i));
    return ids;
  }

  function setDynamicToolCount(toolCount) {
    var parsed = parseInt(toolCount, 10);
    var nextCount = !isNaN(parsed) && parsed > 0 ? parsed : 0;
    if (nextCount === dynamicToolCount) return false;

    dynamicToolCount = nextCount;
    _rebuildCachedIds();

    var valid = new Set(cachedOrderedIds);
    var removed = ShortcutRegistry.pruneToSet(valid);
    if (removed) _persistBindings();
    return true;
  }

  function applyCustomBinding(actionId, input, flags) {
    if (!actionId) return { ok: false, reason: Strings.validation.missingAction };
    var normalizedInput = _f.normalizeCustomInput(input);
    if (!normalizedInput) return { ok: false, reason: Strings.validation.invalidKey };
    var ok = setBinding(actionId, normalizedInput, flags, _c.toolActionTitle(actionId));
    if (!ok) return { ok: false, reason: Strings.validation.bindingFailed };
    var display = _f.formatShortcutLabel(normalizedInput, _f.normalizeFlags(flags));
    return { ok: true, actionId: actionId, display: display };
  }

  function setBinding(actionId, input, flags, title, skipPersist) {
    if (!actionId || !input) return false;
    var normalizedInput = _f.normalizeInput(input);
    var finalFlags = _f.normalizeFlags(flags);
    var display = _f.formatShortcutLabel(normalizedInput, finalFlags);
    var finalTitle = title || _c.toolActionTitle(actionId);

    var ok = ShortcutRegistry.set(actionId, normalizedInput, finalFlags, finalTitle, display);
    if (ok && !skipPersist) _persistBindings();
    return ok;
  }

  function clearBinding(actionId, skipPersist) {
    var ok = ShortcutRegistry.clear(actionId);
    if (ok && !skipPersist) _persistBindings();
    return ok;
  }

  function restorePersistedBindings() {
    var saved = ShortcutStorage.loadBindings();
    ShortcutRegistry.clearAll();
    for (var actionId in saved) {
      var item = saved[actionId];
      if (!item || !item.input) continue;
      setBinding(actionId, item.input, item.flags, item.title, true);
    }
  }

  function getAdditionalShortcutKeys() {
    var commands = [];
    var ids = _getOrderedIds();
    for (var i = 0; i < ids.length; i++) {
      var b = ShortcutRegistry.get(ids[i]);
      if (b) commands.push({ input: b.input, flags: b.flags, title: 'StylusFlow: ' + b.title });
    }
    return commands;
  }

  function _normalizeKey(command, keyFlags) {
    return { input: _f.normalizeInput(command), flags: typeof keyFlags === 'number' ? keyFlags : 0 };
  }

  function resolveAction(command, keyFlags) {
    var k = _normalizeKey(command, keyFlags);
    return ShortcutRegistry.resolve(k.input, k.flags);
  }

  function queryShortcut(command, keyFlags) {
    var k = _normalizeKey(command, keyFlags);
    return ShortcutRegistry.query(k.input, k.flags);
  }

  function getBindingLabelMap() {
    var map = {};
    var ids = _getOrderedIds();
    for (var i = 0; i < ids.length; i++) {
      var b = ShortcutRegistry.get(ids[i]);
      map[ids[i]] = b ? (b.display || _f.formatShortcutLabel(b.input, b.flags)) : Strings.editor.notSet;
    }
    return map;
  }

  _rebuildCachedIds();

  return {
    applyCustomBinding: applyCustomBinding,
    setBinding: setBinding,
    clearBinding: clearBinding,
    getToolActionIds: getToolActionIds,
    setDynamicToolCount: setDynamicToolCount,
    restorePersistedBindings: restorePersistedBindings,
    getAdditionalShortcutKeys: getAdditionalShortcutKeys,
    resolveAction: resolveAction,
    queryShortcut: queryShortcut,
    getBindingLabelMap: getBindingLabelMap,
  };
})();
