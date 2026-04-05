const ShortcutBindings = (() => {
  const { ACTIONS, DEFAULT_TOOL_COUNT, getToolActionId, toolActionTitle } = ShortcutConstants;
  const { normalizeInput, normalizeFlags, formatShortcutLabel } = ShortcutFormatter;

  const bindings = {};
  let dynamicToolCount = DEFAULT_TOOL_COUNT;
  let bindingCount = 0;

  let cachedOrderedIds = null;

  const reverseMap = {};

  function clearAllBindings() {
    for (const key in bindings) delete bindings[key];
    for (const key in reverseMap) delete reverseMap[key];
    bindingCount = 0;
  }

  function exportBindings() {
    const out = {};
    for (const actionId in bindings) {
      const binding = bindings[actionId];
      out[actionId] = {
        input: binding.input,
        flags: binding.flags,
        title: binding.title || null,
      };
    }
    return out;
  }

  function persistBindings() {
    return ShortcutStorage.saveBindings(exportBindings());
  }

  function rebuildCachedIds() {
    const ids = [ACTIONS.PREV_TOOL, ACTIONS.NEXT_TOOL];
    const count = Math.max(dynamicToolCount, DEFAULT_TOOL_COUNT);
    for (let i = 1; i <= count; i++) ids.push(getToolActionId(i));
    cachedOrderedIds = ids;
    return ids;
  }

  function getOrderedActionIds() {
    return cachedOrderedIds || rebuildCachedIds();
  }

  function getToolActionIds() {
    const ids = [];
    for (let i = 1; i <= dynamicToolCount; i++) ids.push(getToolActionId(i));
    return ids;
  }

  function setDynamicToolCount(toolCount) {
    const parsed = parseInt(toolCount, 10);
    const nextCount = !isNaN(parsed) && parsed > 0 ? parsed : 0;
    if (nextCount === dynamicToolCount) return false;

    dynamicToolCount = nextCount;
    rebuildCachedIds();

    let removed = false;
    const valid = new Set(cachedOrderedIds);
    for (const actionId in bindings) {
      if (!valid.has(actionId)) {
        delete reverseMap[`${bindings[actionId].input}__${bindings[actionId].flags}`];
        delete bindings[actionId];
        bindingCount--;
        removed = true;
      }
    }

    if (removed) persistBindings();

    return true;
  }

  function removeConflictedBinding(actionId, input, flags) {
    if (!input) return;
    const key = `${input}__${flags}`;
    const conflicted = reverseMap[key];
    if (conflicted && conflicted !== actionId) {
      delete bindings[conflicted];
      delete reverseMap[key];
      bindingCount--;
    }
  }

  function setBinding(actionId, input, flags, title, skipPersist) {
    if (!actionId || !input) return false;
    const normalizedInput = normalizeInput(input);
    const finalFlags = normalizeFlags(flags);

    const key = `${normalizedInput}__${finalFlags}`;
    if (reverseMap[key] === actionId && bindings[actionId]) return true;

    removeConflictedBinding(actionId, normalizedInput, finalFlags);

    if (!bindings[actionId]) bindingCount++;

    bindings[actionId] = {
      actionId,
      input: normalizedInput,
      flags: finalFlags,
      title: title || toolActionTitle(actionId),
      display: formatShortcutLabel(normalizedInput, finalFlags),
    };
    reverseMap[key] = actionId;
    if (!skipPersist) persistBindings();
    return true;
  }

  function clearBinding(actionId, skipPersist) {
    if (!actionId || !bindings[actionId]) return false;
    const binding = bindings[actionId];
    delete reverseMap[`${binding.input}__${binding.flags}`];
    delete bindings[actionId];
    bindingCount--;
    if (!skipPersist) persistBindings();
    return true;
  }

  function getBinding(actionId) {
    return bindings[actionId] || null;
  }

  function getBindingCount() {
    return bindingCount;
  }

  function bindDefaultShortcuts() {
    clearAllBindings();
    persistBindings();
  }

  function clearRuntimeBindings() {
    clearAllBindings();
  }

  function restorePersistedBindings() {
    const saved = ShortcutStorage.loadBindings();
    clearAllBindings();
    for (const actionId in saved) {
      const item = saved[actionId];
      if (!item || !item.input) continue;
      setBinding(actionId, item.input, item.flags, item.title, true);
    }
  }

  function getAdditionalShortcutKeys() {
    const commands = [];
    const seen = new Set();
    const ids = getOrderedActionIds();

    for (let i = 0; i < ids.length; i++) {
      const actionId = ids[i];
      const binding = bindings[actionId];
      if (binding) {
        const key = `${binding.input}__${binding.flags}`;
        if (!seen.has(key)) {
          seen.add(key);
          commands.push({
            input: binding.input,
            flags: binding.flags,
            title: `StylusFlow: ${binding.title}`,
          });
        }
      }
    }
    return commands;
  }

  function resolveAction(command, keyFlags) {
    const normalizedCommand = normalizeInput(command);
    const normalizedFlags = typeof keyFlags === 'number' ? keyFlags : 0;
    return reverseMap[`${normalizedCommand}__${normalizedFlags}`] || null;
  }

  function queryShortcut(command, keyFlags) {
    const actionId = resolveAction(command, keyFlags);
    if (!actionId) return null;
    return { checked: false, disabled: false };
  }

  function getBindingLabelMap() {
    const map = {};
    const ids = getOrderedActionIds();
    for (let i = 0; i < ids.length; i++) {
      const actionId = ids[i];
      const binding = bindings[actionId];
      map[actionId] = binding ? binding.display : '未设置';
    }
    return map;
  }

  rebuildCachedIds();

  return {
    setBinding,
    clearBinding,
    getBinding,
    getBindingCount,
    getToolActionIds,
    setDynamicToolCount,
    bindDefaultShortcuts,
    clearRuntimeBindings,
    restorePersistedBindings,
    getAdditionalShortcutKeys,
    resolveAction,
    queryShortcut,
    getBindingLabelMap,
  };
})();
