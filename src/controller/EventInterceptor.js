// PDF 视图事件拦截器：在 MbUIBookView 上附加 PanGestureRecognizer，
// 拖动事件转发给 DocumentScrollController 平移文档，其他事件正常透传。
// EventInterceptor.start(addon) / .stop() / .handlePan(recognizer) / .isActive()
const EventInterceptor = (function () {
  var _active = false;
  var _addon = null;
  var _target = null; // MbUIBookView
  var _panRecognizer = null;

  function findBookView(addon) {
    var app = Application.sharedInstance();
    var sc = app.studyController(addon.window);
    if (!sc || !sc.readerController || !sc.readerController.view) return null;
    return UIViewTree.findNodeByClass(sc.readerController.view, 'MbUIBookView');
  }

  function start(addon) {
    if (_active) return true;

    var bookView = findBookView(addon);
    if (!bookView) {
      console.log('[StylusFlow][Intercept] 未找到 MbUIBookView，无法开启拦截');
      return false;
    }

    _addon = addon;
    _target = bookView;
    _panRecognizer = new UIPanGestureRecognizer(addon, 'onInterceptPan:');
    _target.addGestureRecognizer(_panRecognizer);

    // 让所有已有识别器等待我们的识别器失败后才生效
    var existing = UIViewTree.toArray(_target.gestureRecognizers);
    var prioritized = 0;
    for (var i = 0; i < existing.length; i++) {
      if (existing[i] === _panRecognizer) continue;
      try { existing[i].requireGestureRecognizerToFail(_panRecognizer); prioritized++; } catch (e) {}
    }

    _active = true;
    console.log('[StylusFlow][Intercept] 已在 MbUIBookView 上附加 PanGestureRecognizer，优先级覆盖 ' + String(prioritized) + ' 个原生手势');
    return true;
  }

  function stop() {
    if (!_active) return;

    if (_target && _panRecognizer) {
      try { _target.removeGestureRecognizer(_panRecognizer); } catch (e) {
        console.log('[StylusFlow][Intercept] removeGestureRecognizer 失败: ' + String(e));
      }
    }
    _active = false;
    _addon = null;
    _target = null;
    _panRecognizer = null;

    console.log('[StylusFlow][Intercept] 拦截已关闭，PanGestureRecognizer 已移除');
  }

  function handlePan(recognizer) {
    if (!_active || !_target || !_addon) return;
    try {
      var translation = recognizer.translationInView(_target);
      var dx = Number(translation.x || 0);
      var dy = Number(translation.y || 0);
      recognizer.setTranslationInView({ x: 0, y: 0 }, _target);

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
    handlePan: handlePan,
    isActive: function () { return _active; },
  };
})();
