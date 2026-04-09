// PDF 事件拦截器：生命周期管理 + 门控同步 + 平移转发
// 视图附加由 PanGesturePool 管理；依赖 PanGateController + DocumentScrollController
const EventInterceptor = (function () {
  var _active = false;
  var _desiredActive = true;
  var _addon = null;
  var _pool = null;

  function _recState(rec) { try { return Number(rec.state); } catch (e) { return -1; } }
  function _isTerminal(s) { return s === 3 || s === 4 || s === 5; }

  // ── 门控同步 ────────────────────────────────────────────────
  function syncGate() {
    if (!_pool) return;
    _pool.syncEnabled(_active && (PanGateController.isActive() || _pool.hasActiveGesture()));
  }

  // ── 生命周期 ────────────────────────────────────────────────
  function start(addon) {
    _desiredActive = true;
    if (_active) return true;
    var pool = createPanGesturePool(addon);
    if (!pool.refresh()) {
      console.log('[StylusFlow][Intercept] 未找到 MbUIBookView，无法开启拦截');
      return false;
    }
    _pool = pool;
    _addon = addon;
    _active = true;
    syncGate();
    return true;
  }

  function stop() {
    _desiredActive = false;
    if (!_active) return;
    if (_pool) { _pool.detachAll(); _pool = null; }
    _active = false;
    _addon = null;
    console.log('[StylusFlow][Intercept] 拦截已关闭');
  }

  function refresh() {
    if (!_active || !_pool) return;
    _pool.refresh();
    syncGate();
  }

  function ensure(addon) {
    if (!_desiredActive) return false;
    if (_active) { refresh(); return true; }
    return start(addon);
  }

  // ── 平移处理 ────────────────────────────────────────────────
  function handlePan(recognizer) {
    if (!_active || !_pool) return;
    try {
      var entry = _pool.findByRecognizer(recognizer);
      var state = _recState(recognizer);

      if (entry && _isTerminal(state)) {
        entry.gestureActive = false;
        syncGate();
        return;
      }

      if (entry && !entry.gestureActive && PanGateController.isActive()) {
        entry.gestureActive = true;
      }

      if (!(entry && entry.gestureActive) && !PanGateController.isActive()) {
        syncGate();
        return;
      }

      var ref = _pool.getRefView(recognizer.view);
      if (!ref) return;
      var translation = recognizer.translationInView(ref);
      var dx = Number(translation.x || 0);
      var dy = Number(translation.y || 0);
      recognizer.setTranslationInView({ x: 0, y: 0 }, ref);

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        var sc = Application.sharedInstance().studyController(_addon.window);
        if (sc) DocumentScrollController.panStudyView(sc, dx, dy);
      }

      if (entry && _isTerminal(_recState(recognizer))) {
        entry.gestureActive = false;
        syncGate();
      }
    } catch (e) {
      console.log('[StylusFlow][Intercept] PAN 处理失败: ' + String(e));
    }
  }

  return {
    start: start,
    stop: stop,
    ensure: ensure,
    refresh: refresh,
    handlePan: handlePan,
    syncGate: syncGate,
    isActive: function () { return _active; },
  };
})();
