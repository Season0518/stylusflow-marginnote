// PDF 手势识别器池：管理 MbUIBookView 上 UIPanGestureRecognizer 的附加与生命周期
// createPanGesturePool(addon) → pool 实例（每次 start 创建一个新实例）
// 依赖 UIViewTree
function createPanGesturePool(addon) {
  var _entries = []; // { view, recognizer, gestureActive }
  var _lastBookCount = -1;

  function _getReaderView() {
    var sc = Application.sharedInstance().studyController(addon.window);
    return (sc && sc.readerController) ? sc.readerController.view : null;
  }

  function _setEnabled(rec, enabled) {
    try { if (rec && rec.enabled !== enabled) rec.enabled = enabled; } catch (e) {}
  }

  function _attachTo(view) {
    var rec = new UIPanGestureRecognizer(addon, 'onInterceptPan:');
    view.addGestureRecognizer(rec);
    var existing = UIViewTree.toArray(view.gestureRecognizers);

    for (var i = 0; i < existing.length; i++) {
      var gest = existing[i];
      if (gest !== rec) {
        try { gest.requireGestureRecognizerToFail(rec); } catch (e) {}
      }
    }
    _entries.push({ view: view, recognizer: rec, gestureActive: false });
  }

  // ── 查询 ────────────────────────────────────────────────────
  function hasActiveGesture() {
    for (var i = 0; i < _entries.length; i++) if (_entries[i].gestureActive) return true;
    return false;
  }

  function findByRecognizer(rec) {
    for (var i = 0; i < _entries.length; i++) if (_entries[i].recognizer === rec) return _entries[i];
    return null;
  }

  function getRefView(recognizerView) {
    return recognizerView || (_entries.length > 0 ? _entries[0].view : null);
  }

  // ── 管理 ────────────────────────────────────────────────────
  function syncEnabled(enabled) {
    for (var i = 0; i < _entries.length; i++) _setEnabled(_entries[i].recognizer, enabled);
  }

  function detachAll() {
    for (var i = 0; i < _entries.length; i++) {
      try { _entries[i].view.removeGestureRecognizer(_entries[i].recognizer); } catch (e) {}
    }
    _entries = []; _lastBookCount = -1;
  }

  function refresh() {
    var readerView = _getReaderView();
    if (!readerView) return false;
    var allBooks = UIViewTree.findAllNodesByClass(readerView, 'MbUIBookView');

    if (allBooks.length === _lastBookCount) {
      var ok = true;
      for (var i = 0; i < _entries.length; i++) {
        try { if (!_entries[i].view.superview) { ok = false; break; } } catch (e) { ok = false; break; }
      }
      if (ok) return _entries.length > 0;
    }
    _lastBookCount = allBooks.length;

    var alive = [];
    for (var i = 0; i < _entries.length; i++) {
      try { if (_entries[i].view && _entries[i].view.superview) alive.push(_entries[i]); } catch (e) {}
    }
    _entries = alive;

    for (var j = 0; j < allBooks.length; j++) {
      var seen = false;
      for (var k = 0; k < _entries.length; k++) { if (_entries[k].view === allBooks[j]) { seen = true; break; } }
      if (!seen) _attachTo(allBooks[j]);
    }
    return _entries.length > 0;
  }

  return {
    hasActiveGesture: hasActiveGesture,
    findByRecognizer: findByRecognizer,
    getRefView: getRefView,
    syncEnabled: syncEnabled,
    detachAll: detachAll,
    refresh: refresh,
  };
}
