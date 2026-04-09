// PanGate 控制器：门控状态 + 按键捕获 + 热路径处理 + 公共 API facade
// 实现细节分布于 pangate/：Constants → Storage → Bindings
const PanGateController = (function () {
  var QUERY_RESULT = PanGateConstants.QUERY_RESULT;

  var _lastHeartbeatAt = 0;
  var _captureTarget = null; // 'trigger' | 'stop' | null

  function _now() {
    return (typeof Date !== 'undefined') ? Date.now() : 0;
  }

  // ── 门控状态 ────────────────────────────────────────────────
  function isActive() {
    return _lastHeartbeatAt !== 0 && (_now() - _lastHeartbeatAt) < PanGateBindings.getExpiredMs();
  }

  function heartbeat() { _lastHeartbeatAt = _now(); }
  function forceExpire() { _lastHeartbeatAt = 0; }

  // ── 捕获模式 ────────────────────────────────────────────────
  function startCapture(target) { _captureTarget = target; }
  function isCaptureMode() { return _captureTarget !== null; }
  function getCaptureTarget() { return _captureTarget; }
  function cancelCapture() { _captureTarget = null; }

  // ── 热路径：归一化一次，直接比对已归一化的存储值 ──────────────
  function queryKey(input, flags) {
    if (_captureTarget !== null) return QUERY_RESULT;
    var ni = ShortcutFormatter.normalizeInput(input);
    var nf = ShortcutFormatter.normalizeFlags(flags);
    if (PanGateBindings.matchesTrigger(ni, nf) || PanGateBindings.matchesStop(ni, nf)) return QUERY_RESULT;
    return null;
  }

  function processKey(input, flags) {
    if (_captureTarget !== null) {
      PanGateBindings.finishCapture(input, flags, _captureTarget);
      _captureTarget = null;
      forceExpire();
      return 'capture';
    }
    var ni = ShortcutFormatter.normalizeInput(input);
    var nf = ShortcutFormatter.normalizeFlags(flags);
    if (PanGateBindings.matchesTrigger(ni, nf)) { heartbeat(); return 'trigger'; }
    if (PanGateBindings.matchesStop(ni, nf)) { forceExpire(); return 'stop'; }
    return null;
  }

  // ── 调试 ───────────────────────────────────────────────────
  function getDebugState() {
    var stopB = PanGateBindings.getStopBinding();
    return {
      isActive: isActive(),
      expiredMs: PanGateBindings.getExpiredMs(),
      triggerLabel: PanGateBindings.getTriggerBinding().display,
      stopLabel: stopB ? stopB.display : Strings.debug.notSet,
      captureTarget: _captureTarget,
    };
  }

  // ── 生命周期 ────────────────────────────────────────────────
  function init() { PanGateBindings.init(); }

  function resetConfig() {
    PanGateBindings.resetConfig();
    _lastHeartbeatAt = 0;
    _captureTarget = null;
  }

  return {
    isActive: isActive,
    heartbeat: heartbeat,
    forceExpire: forceExpire,
    startCapture: startCapture,
    isCaptureMode: isCaptureMode,
    getCaptureTarget: getCaptureTarget,
    cancelCapture: cancelCapture,
    queryKey: queryKey,
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
    resetTriggerBinding: PanGateBindings.resetTriggerBinding,
    resetExpiredMs: PanGateBindings.resetExpiredMs,
    applyTriggerBinding: PanGateBindings.applyTriggerBinding,
    applyStopBinding: PanGateBindings.applyStopBinding,
    getAdditionalShortcutKeys: PanGateBindings.getAdditionalShortcutKeys,
    STORAGE_KEY: PanGateConstants.STORAGE_KEY,
    STEP: PanGateConstants.STEP,
  };
})();
