const ShortcutRuntime = (() => {
  const { toolActionTitle } = ShortcutConstants;
  const { formatShortcutLabel, timestampLabel } = ShortcutFormatter;

  const { none, noTrigger, executed, notExecuted, notSet } = Strings.debug;

  const runtime = {
    triggerCount: 0,
    lastShortcut: none,
    lastActionTitle: none,
    lastResult: noTrigger,
    lastAt: none,
    lastBindingAction: none,
    lastBindingValue: none,
    lastBindingAt: none,
  };

  function markBindingChanged(actionId, display) {
    runtime.lastBindingAction = toolActionTitle(actionId);
    runtime.lastBindingValue = display || notSet;
    runtime.lastBindingAt = timestampLabel();
  }

  function recordProcessResult(actionId, command, keyFlags, result) {
    runtime.triggerCount += 1;
    runtime.lastShortcut = formatShortcutLabel(command, keyFlags);
    runtime.lastActionTitle = toolActionTitle(actionId);
    runtime.lastResult = result?.handled ? executed : (result?.reason || notExecuted);
    runtime.lastAt = timestampLabel();
  }

  function getDebugState(bindingCount) {
    return {
      bindingCount,
      triggerCount: runtime.triggerCount,
      lastShortcut: runtime.lastShortcut,
      lastActionTitle: runtime.lastActionTitle,
      lastResult: runtime.lastResult,
      lastAt: runtime.lastAt,
      lastBindingAction: runtime.lastBindingAction,
      lastBindingValue: runtime.lastBindingValue,
      lastBindingAt: runtime.lastBindingAt,
    };
  }

  return { markBindingChanged, recordProcessResult, getDebugState };
})();
