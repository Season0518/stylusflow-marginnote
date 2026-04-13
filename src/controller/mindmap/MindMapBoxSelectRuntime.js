// 脑图框选运行态：编排标定与桥接两个子模块，对外暴露稳定 facade API
function createMindMapBoxSelectRuntime() {
  var calibration = createMindMapBoxCalibration();
  var bridge = createMindMapBoxBridge();

  function _preferredRecognizerId() {
    var recognizerInfo = calibration.getRecognizerInfo();
    return recognizerInfo && recognizerInfo.recognizerId ? recognizerInfo.recognizerId : '2273';
  }

  function startCalibration(studyController) {
    stopBoxSelectMode();
    return calibration.start(studyController);
  }

  function toggleBoxSelectMode(studyController) {
    if (bridge.isActive()) {
      stopBoxSelectMode();
      return true;
    }
    var captured = calibration.captureSelectionPanInstance(studyController, _preferredRecognizerId());
    if (!captured) return false;
    return bridge.start(studyController, captured.recognizerId || '2273');
  }

  function ensureBoxSelectMode(studyController) {
    if (!PanGateController.isAutoOpenEnabled()) return false;
    if (bridge.isActive()) {
      syncPanGate('ensure.active');
      return true;
    }
    var captured = calibration.captureSelectionPanInstance(studyController, _preferredRecognizerId());
    if (!captured) return false;
    return bridge.start(studyController, captured.recognizerId || '2273');
  }

  function stopBoxSelectMode() {
    calibration.stop();
    bridge.stop();
  }

  function syncPanGate(reason) {
    if (!bridge.isActive()) return false;
    return bridge.syncPanGate();
  }

  function getDebugState(studyController) {
    var recognizerInfo = calibration.getRecognizerInfo();
    var nativeState = bridge.getNativeSelectionState(studyController, _preferredRecognizerId());
    var bridgeState = bridge.getBridgeState();
    var active = bridge.isActive();
    return {
      calibrated: !!recognizerInfo,
      calibrationActive: calibration.isActive(),
      modeActive: active,
      nativeSelectionFound: nativeState.found,
      nativeSelectionEnabled: nativeState.enabled,
      nativeSelectionState: nativeState.state,
      bridgeRecognizerFound: bridgeState.found,
      bridgeRecognizerEnabled: bridgeState.enabled,
      bridgeRecognizerState: bridgeState.state,
      panGateSessionActive: PanGateController.isSessionActive(),
      recognizerName: active
        ? 'InjectedUIPan'
        : (nativeState.found ? 'SelectionPanGesture' : (recognizerInfo ? recognizerInfo.className : 'none')),
    };
  }

  return {
    startCalibration: startCalibration,
    toggleBoxSelectMode: toggleBoxSelectMode,
    ensureBoxSelectMode: ensureBoxSelectMode,
    stopBoxSelectMode: stopBoxSelectMode,
    syncPanGate: syncPanGate,
    getDebugState: getDebugState,
  };
}
