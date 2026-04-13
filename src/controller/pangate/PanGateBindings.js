// PanGate 绑定状态：触发键 / 停止键 / 失效时间的内存状态、匹配与配置操作
// 依赖 PanGateConstants + PanGateStorage + ShortcutFormatter + Strings
const PanGateBindings = (function () {
  var C = PanGateConstants;
  var F = ShortcutFormatter;

  var _expiredMs    = C.DEFAULT_EXPIRED_MS;
  var _triggerInput = C.DEFAULT_TRIGGER_INPUT;
  var _triggerFlags = C.DEFAULT_TRIGGER_FLAGS;
  var _hasStop      = true;
  var _stopInput    = '';
  var _stopFlags    = C.DEFAULT_STOP_FLAGS;
  var _autoOpen     = false;

  function _applyDefaults() {
    _expiredMs    = C.DEFAULT_EXPIRED_MS;
    _triggerInput = C.DEFAULT_TRIGGER_INPUT; _triggerFlags = C.DEFAULT_TRIGGER_FLAGS;
    _hasStop      = true;
    _stopInput    = '';                      _stopFlags    = C.DEFAULT_STOP_FLAGS;
    _autoOpen     = false;
  }

  function _label(type) {
    if (type === 'trigger') return F.formatShortcutLabel(_triggerInput, _triggerFlags) || _triggerInput;
    if (type === 'stop' && _hasStop) return F.formatShortcutLabel(_stopInput, _stopFlags) || _stopInput;
    return null;
  }

  function _save() {
    PanGateStorage.save({
      expiredMs: _expiredMs,
      triggerInput: _triggerInput, triggerFlags: _triggerFlags,
      hasStopBinding: _hasStop,
      stopInput: _stopInput,      stopFlags: _stopFlags,
      autoOpen: _autoOpen,
    });
  }

  // ── 热路径匹配（接受预归一化值，零额外开销）────────────────────
  function matchesTrigger(ni, nf) {
    if (!_autoOpen) return false;
    return ni === _triggerInput && nf === _triggerFlags;
  }
  function matchesStop(ni, nf) {
    if (!_autoOpen) return false;
    if (!_hasStop) return false;
    if (nf !== _stopFlags) return false;
    if (_stopInput === '') return true;
    return ni === _stopInput;
  }

  // ── 读取 ────────────────────────────────────────────────────
  function getTriggerBinding() {
    return { input: _triggerInput, flags: _triggerFlags, display: _label('trigger') || Strings.debug.notSet };
  }

  function getStopBinding() {
    if (!_hasStop) return null;
    return { input: _stopInput, flags: _stopFlags, display: _label('stop') || Strings.debug.notSet };
  }

  function getExpiredMs() { return _expiredMs; }
  function isAutoOpenEnabled() { return _autoOpen; }

  function getAdditionalShortcutKeys() {
    if (!_autoOpen) return [];
    var cmds = [{ input: _triggerInput, flags: _triggerFlags, title: 'StylusFlow: ' + Strings.debug.panTriggerTitle }];
    if (_hasStop) cmds.push({ input: _stopInput, flags: _stopFlags, title: 'StylusFlow: ' + Strings.debug.panStopTitle });
    return cmds;
  }

  // ── 配置操作 ────────────────────────────────────────────────
  function clearStop() { _hasStop = false; _stopInput = ''; _stopFlags = 0; _save(); }

  function changeExpiredMs(delta) {
    _expiredMs = Math.max(C.MIN_EXPIRED_MS, Math.min(C.MAX_EXPIRED_MS, _expiredMs + delta));
    _save();
  }

  function setExpiredMs(value) {
    var next = parseInt(value, 10);
    if (isNaN(next) || next < C.MIN_EXPIRED_MS || next > C.MAX_EXPIRED_MS) {
      return { ok: false, reason: Strings.validation.invalidExpiredMs };
    }
    _expiredMs = next; _save();
    return { ok: true, value: _expiredMs };
  }

  function resetTriggerBinding() { _triggerInput = C.DEFAULT_TRIGGER_INPUT; _triggerFlags = C.DEFAULT_TRIGGER_FLAGS; _save(); }
  function resetExpiredMs()       { _expiredMs = C.DEFAULT_EXPIRED_MS; _save(); }
  function setAutoOpenEnabled(enabled) {
    _autoOpen = enabled === true;
    _save();
    return { ok: true, value: _autoOpen };
  }

  function applyTriggerBinding(input, flags) {
    var ni = F.normalizeCustomInput(input);
    if (!ni) return { ok: false, reason: Strings.validation.invalidKey };
    _triggerInput = ni; _triggerFlags = F.normalizeFlags(flags); _save();
    return { ok: true, display: _label('trigger') };
  }

  function applyStopBinding(input, flags) {
    var finalFlags = F.normalizeFlags(flags);
    var ni         = F.normalizeCustomInput(input); // 已内置空格处理
    var hasText    = String(input || '').trim().length > 0;
    if (hasText && ni === null)       return { ok: false, reason: Strings.validation.invalidKey };
    if (ni === null && finalFlags === 0) return { ok: false, reason: Strings.validation.invalidPanStop };
    _hasStop = true; _stopInput = ni || ''; _stopFlags = finalFlags; _save();
    return { ok: true, display: _label('stop') };
  }

  function finishCapture(input, flags, target) {
    var ni = F.normalizeInput(input); var nf = F.normalizeFlags(flags);
    if (target === 'trigger')      { _triggerInput = ni; _triggerFlags = nf; }
    else if (target === 'stop')    { _hasStop = true; _stopInput = ni; _stopFlags = nf; }
    _save();
  }

  // ── 持久化 ─────────────────────────────────────────────────
  function init() {
    _applyDefaults();
    var p = PanGateStorage.load();
    if (!p) return;
    if (typeof p.expiredMs === 'number')      _expiredMs    = Math.max(C.MIN_EXPIRED_MS, Math.min(C.MAX_EXPIRED_MS, p.expiredMs));
    if (typeof p.triggerInput === 'string')   _triggerInput = F.normalizeInput(p.triggerInput);
    if (typeof p.triggerFlags === 'number')   _triggerFlags = F.normalizeFlags(p.triggerFlags);
    if (typeof p.hasStopBinding === 'boolean') {
      _hasStop = p.hasStopBinding;
    } else {
      _hasStop = !!((typeof p.stopInput === 'string' && p.stopInput.length > 0) ||
                    (typeof p.stopFlags === 'number' && p.stopFlags !== 0));
    }
    if (typeof p.stopInput === 'string')  _stopInput = F.normalizeInput(p.stopInput);
    if (typeof p.stopFlags === 'number')  _stopFlags = F.normalizeFlags(p.stopFlags);
    if (typeof p.autoOpen === 'boolean')  _autoOpen = p.autoOpen;
    if (!_hasStop) { _stopInput = ''; _stopFlags = 0; }
  }

  function resetConfig() { _applyDefaults(); }

  return {
    matchesTrigger: matchesTrigger,
    matchesStop: matchesStop,
    getTriggerBinding: getTriggerBinding,
    getStopBinding: getStopBinding,
    getExpiredMs: getExpiredMs,
    isAutoOpenEnabled: isAutoOpenEnabled,
    getAdditionalShortcutKeys: getAdditionalShortcutKeys,
    clearStop: clearStop,
    changeExpiredMs: changeExpiredMs,
    setExpiredMs: setExpiredMs,
    setAutoOpenEnabled: setAutoOpenEnabled,
    resetTriggerBinding: resetTriggerBinding,
    resetExpiredMs: resetExpiredMs,
    applyTriggerBinding: applyTriggerBinding,
    applyStopBinding: applyStopBinding,
    finishCapture: finishCapture,
    init: init,
    resetConfig: resetConfig,
  };
})();
