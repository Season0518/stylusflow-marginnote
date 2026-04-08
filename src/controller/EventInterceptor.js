// PDF 视图事件拦截器：在所有 MbUIBookView 上附加 PanGestureRecognizer，
// 拖动事件转发给 DocumentScrollController 平移文档，其他事件正常透传。
// 支持动态出现的留白视图（第二个 MbUIBookView），通过 refresh() 自动检测并注入。
const EventInterceptor = (function () {
  var _active = false;
  var _addon = null;
  var _entries = []; // [{ view, recognizer }]
  var _lastBookCount = -1; // 变更检测：跳过无变化的 refresh

  function getReaderView() {
    var app = Application.sharedInstance();
    var sc = app.studyController(_addon.window);
    if (!sc || !sc.readerController || !sc.readerController.view) return null;
    return sc.readerController.view;
  }

  function isAttached(view) {
    for (var i = 0; i < _entries.length; i++) {
      if (_entries[i].view === view) return true;
    }
    return false;
  }

  function attachTo(view) {
    var rec = new UIPanGestureRecognizer(_addon, 'onInterceptPan:');
    view.addGestureRecognizer(rec);

    var existing = UIViewTree.toArray(view.gestureRecognizers);
    for (var i = 0; i < existing.length; i++) {
      if (existing[i] !== rec) {
        try { existing[i].requireGestureRecognizerToFail(rec); } catch (e) {}
      }
    }

    _entries.push({ view: view, recognizer: rec });
    console.log('[StylusFlow][Intercept] 附加至 ' + UIViewTree.getClassName(view));
  }

  function detachAll() {
    for (var i = 0; i < _entries.length; i++) {
      try { _entries[i].view.removeGestureRecognizer(_entries[i].recognizer); } catch (e) {}
    }
    _entries = [];
    _lastBookCount = -1;
  }

  function refresh() {
    if (!_active || !_addon) return;

    var readerView = getReaderView();
    if (!readerView) return;
    var allBooks = UIViewTree.findAllNodesByClass(readerView, 'MbUIBookView');

    // 快速路径：数量未变且无销毁，跳过
    if (allBooks.length === _lastBookCount) {
      var allAlive = true;
      for (var i = 0; i < _entries.length; i++) {
        try { if (!_entries[i].view.superview) { allAlive = false; break; } } catch (e) { allAlive = false; break; }
      }
      if (allAlive) return;
    }
    _lastBookCount = allBooks.length;

    // 清理已销毁的
    var alive = [];
    for (var i = 0; i < _entries.length; i++) {
      try {
        if (_entries[i].view && _entries[i].view.superview) { alive.push(_entries[i]); continue; }
      } catch (e) {}
    }
    _entries = alive;

    // 附加到新出现的
    for (var j = 0; j < allBooks.length; j++) {
      if (!isAttached(allBooks[j])) attachTo(allBooks[j]);
    }
  }

  function start(addon) {
    if (_active) return true;
    _addon = addon;
    _active = true;
    refresh();
    if (_entries.length === 0) {
      _active = false;
      _addon = null;
      console.log('[StylusFlow][Intercept] 未找到 MbUIBookView，无法开启拦截');
      return false;
    }
    return true;
  }

  function stop() {
    if (!_active) return;
    detachAll();
    _active = false;
    _addon = null;
    console.log('[StylusFlow][Intercept] 拦截已关闭');
  }

  function handlePan(recognizer) {
    if (!_active || !_addon) return;
    try {
      var ref = recognizer.view || (_entries.length > 0 ? _entries[0].view : null);
      if (!ref) return;
      var translation = recognizer.translationInView(ref);
      var dx = Number(translation.x || 0);
      var dy = Number(translation.y || 0);
      recognizer.setTranslationInView({ x: 0, y: 0 }, ref);

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        var app = Application.sharedInstance();
        var sc = app.studyController(_addon.window);
        if (sc) DocumentScrollController.panStudyView(sc, dx, dy);
      }
    } catch (e) {
      console.log('[StylusFlow][Intercept] PAN 处理失败: ' + String(e));
    }
  }

  return {
    start: start,
    stop: stop,
    refresh: refresh,
    handlePan: handlePan,
    isActive: function () { return _active; },
  };
})();
