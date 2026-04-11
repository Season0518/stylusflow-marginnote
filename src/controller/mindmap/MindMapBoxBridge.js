// 脑图框选桥接：向 MindMapCanvas 注入 UIPanGestureRecognizer
function createMindMapBoxBridge() {
  var _bridge = null;

  function stop() {
    if (_bridge && _bridge.view && _bridge.recognizer) {
      try { _bridge.view.removeGestureRecognizer(_bridge.recognizer); } catch (e) {}
    }

    _bridge = null;
  }

  function start(studyController, preferredRecognizerId) {
    stop();

    var collected = MindMapBoxGestureCollector.collectRecognizerEntries(studyController);
    if (!collected || !collected.mindMapView) {
      return false;
    }

    var sourceEntry = MindMapBoxGestureCollector.findSelectionPanEntry(collected, preferredRecognizerId || '2273');
    if (!sourceEntry) {
      return false;
    }

    var mindMapCanvas = MindMapBoxGestureCollector.findMindMapCanvas(collected);
    if (!mindMapCanvas) {
      return false;
    }

    var attachView = sourceEntry.ownerView || collected.mindMapView;
    var bridgeRecognizer = null;
    try {
      bridgeRecognizer = new UIPanGestureRecognizer(mindMapCanvas, 'handlePanGesture:');
      attachView.addGestureRecognizer(bridgeRecognizer);
    } catch (e) {
      return false;
    }

    _bridge = {
      recognizer: bridgeRecognizer,
      view: attachView,
    };

    return true;
  }

  function isActive() {
    return !!_bridge;
  }

  return {
    start: start,
    stop: stop,
    isActive: isActive,
  };
}
