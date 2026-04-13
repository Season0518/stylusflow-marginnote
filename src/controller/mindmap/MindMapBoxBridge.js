// 脑图框选桥接：向 MindMapCanvas 注入 UIPanGestureRecognizer
function createMindMapBoxBridge() {
  var _bridge = null;

  function _enabledValue(recognizer) {
    try { return recognizer && recognizer.enabled !== false; } catch (e) {}
    return null;
  }

  function _stateValue(recognizer) {
    try { return Number(recognizer.state); } catch (e) {}
    return -1;
  }

  function _setEnabled(recognizer, enabled) {
    try { recognizer.enabled = enabled; return true; } catch (e) { return false; }
  }

  function _syncBridgeEnabled() {
    if (!_bridge || !_bridge.recognizer) return false;
    var shouldEnable = !PanGateController.isSessionActive();
    if (_enabledValue(_bridge.recognizer) !== shouldEnable) {
      _setEnabled(_bridge.recognizer, shouldEnable);
    }
    _bridge.enabledState = _enabledValue(_bridge.recognizer);
    return _bridge.enabledState === shouldEnable;
  }

  function stop() {
    if (_bridge && _bridge.view && _bridge.recognizer) {
      try { _bridge.view.removeGestureRecognizer(_bridge.recognizer); } catch (e) {}
    }
    _bridge = null;
  }

  function start(studyController, preferredRecognizerId) {
    stop();

    var collected = MindMapBoxGestureCollector.collectRecognizerEntries(studyController);
    if (!collected || !collected.mindMapView) return false;

    var sourceEntry = MindMapBoxGestureCollector.findSelectionPanEntry(collected, preferredRecognizerId || '2273');
    if (!sourceEntry) return false;

    var mindMapCanvas = MindMapBoxGestureCollector.findMindMapCanvas(collected);
    if (!mindMapCanvas) return false;

    var attachView = sourceEntry.ownerView || collected.mindMapView;
    var bridgeRecognizer = null;
    try {
      bridgeRecognizer = new UIPanGestureRecognizer(mindMapCanvas, 'handlePanGesture:');
      attachView.addGestureRecognizer(bridgeRecognizer);
    } catch (e) {
      return false;
    }

    _bridge = { recognizer: bridgeRecognizer, view: attachView, enabledState: null };
    _syncBridgeEnabled();
    return true;
  }

  function isActive() {
    return !!_bridge;
  }

  function getNativeSelectionState(studyController, preferredRecognizerId) {
    var collected = MindMapBoxGestureCollector.collectRecognizerEntries(studyController);
    if (!collected || !collected.mindMapView) return { found: false, enabled: null, state: -1 };
    var entry = MindMapBoxGestureCollector.findSelectionPanEntry(collected, preferredRecognizerId || '2273');
    if (!entry || !entry.recognizer) return { found: false, enabled: null, state: -1 };
    return { found: true, enabled: _enabledValue(entry.recognizer), state: _stateValue(entry.recognizer) };
  }

  function syncPanGate() {
    return _syncBridgeEnabled();
  }

  function getBridgeState() {
    if (!_bridge || !_bridge.recognizer) return { found: false, enabled: null, state: -1 };
    return { found: true, enabled: _enabledValue(_bridge.recognizer), state: _stateValue(_bridge.recognizer) };
  }

  return {
    start: start,
    stop: stop,
    getNativeSelectionState: getNativeSelectionState,
    syncPanGate: syncPanGate,
    getBridgeState: getBridgeState,
    isActive: isActive,
  };
}
