// 分子：快捷键运行时信息区（一组 KVRow）
// InfoSection.build(parent, panelWidth, data, startY) → nextY
const InfoSection = (function () {
  function build(parent, panelWidth, data, startY) {
    var y = startY;
    var F = Strings.debug.fields;
    var sc = data.shortcuts || {};
    y = KVRow.make(parent, F.visible,          data.isVisible,                          y, 0, panelWidth);
    y = KVRow.make(parent, F.toolCount,        data.toolCount,                          y, 0, panelWidth);
    y = KVRow.make(parent, F.bindingCount,     sc.bindingCount  || 0,                   y, 0, panelWidth);
    y = KVRow.make(parent, F.triggerCount,     sc.triggerCount  || 0,                   y, 0, panelWidth);
    y = KVRow.make(parent, F.lastShortcut,     sc.lastShortcut  || Strings.debug.none,  y, 0, panelWidth);
    y = KVRow.make(parent, F.lastAction,       sc.lastActionTitle || Strings.debug.none, y, 0, panelWidth);
    y = KVRow.make(parent, F.lastResult,       sc.lastResult    || Strings.debug.noTrigger, y, 0, panelWidth);
    y = KVRow.make(parent, F.lastAt,           sc.lastAt        || Strings.debug.none,  y, 0, panelWidth);
    y = KVRow.make(parent, F.lastBindingAction, sc.lastBindingAction || Strings.debug.none, y, 0, panelWidth);
    y = KVRow.make(parent, F.lastBindingValue, sc.lastBindingValue || Strings.debug.none, y, 0, panelWidth);
    y = KVRow.make(parent, F.lastBindingAt,    sc.lastBindingAt || Strings.debug.none,  y, 0, panelWidth);
    y = KVRow.make(parent, F.interceptStatus,  data.interceptStatus || Strings.debug.disabled, y, 0, panelWidth);
    y = KVRow.make(parent, F.panGateStatus,    data.panGateStatus || Strings.debug.disabled, y, 0, panelWidth);
    y = KVRow.make(parent, F.panTriggerKey,    data.panTriggerKey || Strings.debug.notSet, y, 0, panelWidth);
    y = KVRow.make(parent, F.panStopKey,       data.panStopKey || Strings.debug.notSet, y, 0, panelWidth);
    y = KVRow.make(parent, F.panExpiredMs,     data.panExpiredMs || '0ms', y, 0, panelWidth);
    return y;
  }

  return { build: build };
})();
