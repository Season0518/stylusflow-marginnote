const ShortcutRuntime = (() => {
  const { toolActionTitle } = ShortcutConstants;
  const { formatShortcutLabel, timestampLabel } = ShortcutFormatter;

  const runtime = {
    triggerCount: 0,
    lastShortcut: '无',
    lastActionTitle: '无',
    lastResult: '未触发',
    lastAt: '无',
    lastBindingAction: '无',
    lastBindingValue: '无',
    lastBindingAt: '无',
  };

  function markBindingChanged(actionId, display) {
    runtime.lastBindingAction = toolActionTitle(actionId);
    runtime.lastBindingValue = display || '未设置';
    runtime.lastBindingAt = timestampLabel();
  }

  function recordProcessResult(actionId, command, keyFlags, result) {
    runtime.triggerCount += 1;
    runtime.lastShortcut = formatShortcutLabel(command, keyFlags);
    runtime.lastActionTitle = toolActionTitle(actionId);
    runtime.lastResult = result?.handled ? '已执行' : (result?.reason || '未执行');
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
