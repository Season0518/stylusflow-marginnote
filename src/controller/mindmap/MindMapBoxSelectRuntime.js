// 脑图框选运行态：编排标定与桥接两个子模块，对外暴露稳定 facade API
function createMindMapBoxSelectRuntime() {
  var calibration = createMindMapBoxCalibration();
  var bridge = createMindMapBoxBridge();

  function startCalibration(studyController) {
    stopBoxSelectMode();
    return calibration.start(studyController);
  }

  function toggleBoxSelectMode(studyController) {
    if (bridge.isActive()) {
      stopBoxSelectMode();
      return true;
    }

    var recognizerInfo = calibration.getRecognizerInfo();
    var captured = calibration.captureSelectionPanInstance(studyController, recognizerInfo ? recognizerInfo.recognizerId : '2273');
    if (!captured) {
      return false;
    }
    return bridge.start(studyController, captured.recognizerId || '2273');
  }

  function stopBoxSelectMode() {
    calibration.stop();
    bridge.stop();
  }

  function getDebugState() {
    var recognizerInfo = calibration.getRecognizerInfo();
    return {
      calibrated: !!recognizerInfo,
      calibrationActive: calibration.isActive(),
      modeActive: bridge.isActive(),
      recognizerName: bridge.isActive()
        ? 'InjectedUIPan'
        : (recognizerInfo ? recognizerInfo.className : 'none'),
    };
  }

  return {
    startCalibration: startCalibration,
    toggleBoxSelectMode: toggleBoxSelectMode,
    stopBoxSelectMode: stopBoxSelectMode,
    getDebugState: getDebugState,
  };
}
