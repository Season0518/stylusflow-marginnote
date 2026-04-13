// PanGate 控制器：门控状态 + 按键捕获 + 热路径处理 + 公共 API facade
// 实现细节分布于 pangate/：Constants → Storage → Bindings
const PanGateController = (function () {
  var QUERY_RESULT = PanGateConstants.QUERY_RESULT;

  var _lastHeartbeatAt = 0;
  var _captureTarget = null; // 'trigger' | 'stop' | null
  var _stateListeners = [];
  var _expiryTimer = null;

  function _now() { return Date.now(); }

  // ── 门控状态 ────────────────────────────────────────────────
  function isActive() {
    return _lastHeartbeatAt !== 0 && (_now() - _lastHeartbeatAt) < PanGateBindings.getExpiredMs();
  }

  function isSessionActive() {
    return isActive() || PanGateHttpSignal.isInFlight();
  }

  function _notifyStateListeners(reason) {
    for (var i = 0; i < _stateListeners.length; i++) {
      try {
        _stateListeners[i]({
          reason: reason,
          isActive: isActive(),
          isSessionActive: isSessionActive(),
          lastHeartbeatAt: _lastHeartbeatAt,
        });
      } catch (e) {}
    }
  }

  function _cancelExpiryTimer() {
    if (_expiryTimer) {
      try { _expiryTimer.invalidate(); } catch (e) {}
    }
    _expiryTimer = null;
  }

  function _scheduleExpiryNotify(expectedHeartbeatAt) {
    _cancelExpiryTimer();
    try {
      _expiryTimer = NSTimer.scheduledTimerWithTimeInterval((PanGateBindings.getExpiredMs() + 20) / 1000, false, function (timer) {
        try { if (timer) timer.invalidate(); } catch (e) {}
        _expiryTimer = null;
        if (_lastHeartbeatAt !== expectedHeartbeatAt) return;
        if (isSessionActive()) return;
        _notifyStateListeners('expired');
      });
    } catch (e) {
      _expiryTimer = null;
    }
  }

  function heartbeat() {
    _lastHeartbeatAt = _now();
    _scheduleExpiryNotify(_lastHeartbeatAt);
  }
  function forceExpire() {
    _lastHeartbeatAt = 0;
    _cancelExpiryTimer();
  }

  // ── 捕获模式 ────────────────────────────────────────────────
  function startCapture(target) { _captureTarget = target; }
  function isCaptureMode() { return _captureTarget !== null; }
  function getCaptureTarget() { return _captureTarget; }
  function cancelCapture() { _captureTarget = null; }

  // ── 热路径：归一化一次，直接比对已归一化的存储值 ──────────────
  function queryKeyNormalized(ni, nf) {
    if (_captureTarget !== null) return true;
    if (!PanGateBindings.isAutoOpenEnabled()) return false;
    return PanGateBindings.matchesTrigger(ni, nf) || PanGateBindings.matchesStop(ni, nf);
  }

  function queryKey(input, flags) {
    var ni = ShortcutFormatter.normalizeInput(input);
    var nf = ShortcutFormatter.normalizeFlags(flags);
    return queryKeyNormalized(ni, nf) ? QUERY_RESULT : null;
  }

  function processKey(input, flags) {
    var ni = ShortcutFormatter.normalizeInput(input);
    var nf = ShortcutFormatter.normalizeFlags(flags);
    if (_captureTarget !== null) {
      PanGateBindings.finishCapture(input, flags, _captureTarget);
      _captureTarget = null;
      forceExpire();
      _notifyStateListeners('capture');
      return 'capture';
    }
    if (!PanGateBindings.isAutoOpenEnabled()) return null;
    if (PanGateBindings.matchesTrigger(ni, nf)) {
      heartbeat();
      _notifyStateListeners('trigger');
      return 'trigger';
    }
    if (PanGateBindings.matchesStop(ni, nf)) {
      forceExpire();
      _notifyStateListeners('stop');
      return 'stop';
    }
    return null;
  }

  // ── 调试 ───────────────────────────────────────────────────
  function getDebugState() {
    var stopB = PanGateBindings.getStopBinding();
    return {
      isActive: isActive(),
      autoOpenEnabled: PanGateBindings.isAutoOpenEnabled(),
      autoSelectToolEnabled: PanGateBindings.isAutoSelectToolEnabled(),
      expiredMs: PanGateBindings.getExpiredMs(),
      triggerLabel: PanGateBindings.getTriggerBinding().display,
      stopLabel: stopB ? stopB.display : Strings.debug.notSet,
      captureTarget: _captureTarget,
    };
  }

  // ── 生命周期 ────────────────────────────────────────────────
  function init() {
    PanGateBindings.init();
    PanGateHttpSignal.init(function (reason) {
      _notifyStateListeners('http.' + String(reason || 'change'));
    });
  }

  function resetConfig() {
    PanGateBindings.resetConfig();
    _lastHeartbeatAt = 0;
    _captureTarget = null;
    _cancelExpiryTimer();
    _notifyStateListeners('reset');
  }

  function setAutoOpenEnabled(enabled) {
    var result = PanGateBindings.setAutoOpenEnabled(enabled);
    if (!result || !result.ok) return result;
    if (!result.value) {
      forceExpire();
      PanGateHttpSignal.reset('auto-off');
    }
    _notifyStateListeners(result.value ? 'auto-on' : 'auto-off');
    return result;
  }

  function addStateListener(listener) {
    if (typeof listener !== 'function') return false;
    for (var i = 0; i < _stateListeners.length; i++) {
      if (_stateListeners[i] === listener) return true;
    }
    _stateListeners.push(listener);
    return true;
  }

  function removeStateListener(listener) {
    for (var i = _stateListeners.length - 1; i >= 0; i--) {
      if (_stateListeners[i] === listener) _stateListeners.splice(i, 1);
    }
  }

  return {
    isActive: isActive,
    isSessionActive: isSessionActive,
    heartbeat: heartbeat,
    forceExpire: forceExpire,
    startCapture: startCapture,
    isCaptureMode: isCaptureMode,
    getCaptureTarget: getCaptureTarget,
    cancelCapture: cancelCapture,
    queryKey: queryKey,
    queryKeyNormalized: queryKeyNormalized,
    processKey: processKey,
    getDebugState: getDebugState,
    init: init,
    resetConfig: resetConfig,
    // 配置 API 直接引用 PanGateBindings 方法（零开销委托，外部调用方无需改动）
    getTriggerBinding: PanGateBindings.getTriggerBinding,
    getStopBinding: PanGateBindings.getStopBinding,
    getExpiredMs: PanGateBindings.getExpiredMs,
    clearStop: PanGateBindings.clearStop,
    setExpiredMs: PanGateBindings.setExpiredMs,
    changeExpiredMs: PanGateBindings.changeExpiredMs,
    isAutoOpenEnabled: PanGateBindings.isAutoOpenEnabled,
    setAutoOpenEnabled: setAutoOpenEnabled,
    isAutoSelectToolEnabled: PanGateBindings.isAutoSelectToolEnabled,
    setAutoSelectToolEnabled: PanGateBindings.setAutoSelectToolEnabled,
    resetTriggerBinding: PanGateBindings.resetTriggerBinding,
    resetExpiredMs: PanGateBindings.resetExpiredMs,
    applyTriggerBinding: PanGateBindings.applyTriggerBinding,
    applyStopBinding: PanGateBindings.applyStopBinding,
    getAdditionalShortcutKeys: PanGateBindings.getAdditionalShortcutKeys,
    addStateListener: addStateListener,
    removeStateListener: removeStateListener,
    STORAGE_KEY: PanGateConstants.STORAGE_KEY,
    STEP: PanGateConstants.STEP,
  };
})();
