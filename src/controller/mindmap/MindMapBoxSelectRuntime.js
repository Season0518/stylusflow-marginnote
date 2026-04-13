// 脑图框选运行态：编排标定与桥接两个子模块，对外暴露稳定 facade API
function createMindMapBoxSelectRuntime() {
  var calibration = createMindMapBoxCalibration();
  var bridge = createMindMapBoxBridge();

  function _log(message) {
    try { console.log('[StylusFlow MindMapRuntime] ' + String(message || '')); } catch (e) {}
  }

  function _preferredRecognizerId() {
    var recognizerInfo = calibration.getRecognizerInfo();
    return recognizerInfo && recognizerInfo.recognizerId ? recognizerInfo.recognizerId : '2273';
  }

  function startCalibration(studyController) {
    _log('calibration begin modeActive=' + bridge.isActive() + ' freeMoveActive=' + bridge.isFreeMoveActive());
    stopBoxSelectMode();
    var ok = calibration.start(studyController);
    _log('calibration end ok=' + ok);
    return ok;
  }

  function toggleBoxSelectMode(studyController) {
    var wasActive = bridge.isActive();
    _log('toggle begin modeActive=' + wasActive + ' freeMoveActive=' + bridge.isFreeMoveActive());
    if (bridge.isActive()) {
      stopBoxSelectMode();
      _log('toggle end action=stop ok=true modeActive=' + bridge.isActive() + ' freeMoveActive=' + bridge.isFreeMoveActive());
      return true;
    }

    var captured = calibration.captureSelectionPanInstance(studyController, _preferredRecognizerId());
    if (!captured) {
      _log('toggle end action=start ok=false reason=no-captured-selection-pan preferred=' + _preferredRecognizerId());
      return false;
    }
    var ok = bridge.start(studyController, captured.recognizerId || '2273');
    _log(
      'toggle end action=start ok=' + ok +
      ' modeActive=' + bridge.isActive() +
      ' freeMoveActive=' + bridge.isFreeMoveActive() +
      ' recognizerId=' + (captured.recognizerId || '2273')
    );
    return ok;
  }

  function stopBoxSelectMode() {
    _log(
      'stopBoxSelectMode begin calibrationActive=' + calibration.isActive() +
      ' modeActive=' + bridge.isActive() +
      ' freeMoveActive=' + bridge.isFreeMoveActive()
    );
    calibration.stop();
    bridge.stop();
    _log('stopBoxSelectMode end modeActive=' + bridge.isActive() + ' freeMoveActive=' + bridge.isFreeMoveActive());
  }

  function enableFreeMove(studyController) {
    var preferredId = _preferredRecognizerId();
    _log(
      'freeMove begin preferred=' + preferredId +
      ' modeActive=' + bridge.isActive() +
      ' freeMoveActive=' + bridge.isFreeMoveActive()
    );
    calibration.stop();
    var ok = bridge.enableFreeMove(studyController, preferredId);
    var nativeState = bridge.getNativeSelectionState(studyController, preferredId);
    _log(
      'freeMove end ok=' + ok +
      ' modeActive=' + bridge.isActive() +
      ' freeMoveActive=' + bridge.isFreeMoveActive() +
      ' nativeSelectionEnabled=' + nativeState.enabled +
      ' nativeSelectionState=' + nativeState.state
    );
    return ok;
  }

  function restoreBoxSelect(studyController) {
    var preferredId = _preferredRecognizerId();
    _log(
      'restoreBoxSelect begin preferred=' + preferredId +
      ' modeActive=' + bridge.isActive() +
      ' freeMoveActive=' + bridge.isFreeMoveActive()
    );
    var ok = bridge.restoreBoxSelect(studyController, preferredId);
    var nativeState = bridge.getNativeSelectionState(studyController, preferredId);
    _log(
      'restoreBoxSelect end ok=' + ok +
      ' modeActive=' + bridge.isActive() +
      ' freeMoveActive=' + bridge.isFreeMoveActive() +
      ' nativeSelectionEnabled=' + nativeState.enabled +
      ' nativeSelectionState=' + nativeState.state
    );
    return ok;
  }

  function toggleFreeMove(studyController) {
    if (bridge.isFreeMoveActive()) return restoreBoxSelect(studyController);
    return enableFreeMove(studyController);
  }

  function syncPanGate(reason) {
    if (!bridge.isActive()) {
      if (reason && String(reason).indexOf('shortcut.') === 0) {
        _log('syncPanGate skipped reason=' + String(reason) + ' modeActive=false sessionActive=' + PanGateController.isSessionActive());
      }
      return false;
    }
    var ok = bridge.syncPanGate(reason || 'sync');
    _log(
      'syncPanGate reason=' + String(reason || 'sync') +
      ' ok=' + ok +
      ' modeActive=' + bridge.isActive() +
      ' sessionActive=' + PanGateController.isSessionActive()
    );
    return ok;
  }

  function getDebugState(studyController) {
    var recognizerInfo = calibration.getRecognizerInfo();
    var preferredId = _preferredRecognizerId();
    var nativeState = bridge.getNativeSelectionState(studyController, preferredId);
    var bridgeState = bridge.getBridgeState();
    var boxBridgeActive = bridge.isActive();
    var freeMoveActive = bridge.isFreeMoveActive();
    return {
      calibrated: !!recognizerInfo,
      calibrationActive: calibration.isActive(),
      modeActive: boxBridgeActive,
      boxBridgeActive: boxBridgeActive,
      freeMoveActive: freeMoveActive,
      nativeSelectionFound: nativeState.found,
      nativeSelectionEnabled: nativeState.enabled,
      nativeSelectionState: nativeState.state,
      nativeSelectionLabel: nativeState.label,
      bridgeRecognizerFound: bridgeState.found,
      bridgeRecognizerEnabled: bridgeState.enabled,
      bridgeRecognizerState: bridgeState.state,
      panGateSessionActive: PanGateController.isSessionActive(),
      recognizerName: boxBridgeActive
        ? 'InjectedUIPan'
        : (freeMoveActive
          ? 'FreeMove'
          : (nativeState.found ? 'SelectionPanGesture' : (recognizerInfo ? recognizerInfo.className : 'none'))),
    };
  }

  return {
    startCalibration: startCalibration,
    toggleBoxSelectMode: toggleBoxSelectMode,
    stopBoxSelectMode: stopBoxSelectMode,
    enableFreeMove: enableFreeMove,
    restoreBoxSelect: restoreBoxSelect,
    toggleFreeMove: toggleFreeMove,
    syncPanGate: syncPanGate,
    getDebugState: getDebugState,
  };
}
