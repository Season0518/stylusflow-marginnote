function documentPanDebugFeature(ctx) {
  function getStudyController() {
    return Application.sharedInstance().studyController(self.window);
  }

  function refreshDebugPanel() {
    if (ctx && ctx.panel && ctx.panel.isMounted()) ctx.panel.refreshDebug();
  }

  function logMindMapDebug(action, message) {
    try { console.log('[StylusFlow MindMapDebug] action=' + action + ' ' + String(message || '')); } catch (e) {}
  }

  function mindMapStateText(studyController) {
    if (typeof MindMapBoxSelectController === 'undefined') return 'controller=missing';
    try {
      var state = MindMapBoxSelectController.getDebugState(studyController || getStudyController());
      return 'calibrated=' + !!state.calibrated +
        ' calibrationActive=' + !!state.calibrationActive +
        ' modeActive=' + !!state.modeActive +
        ' boxBridgeActive=' + !!state.boxBridgeActive +
        ' freeMoveActive=' + !!state.freeMoveActive +
        ' nativeSelectionFound=' + !!state.nativeSelectionFound +
        ' nativeSelectionEnabled=' + String(state.nativeSelectionEnabled) +
        ' nativeSelectionState=' + String(state.nativeSelectionState) +
        ' bridgeRecognizerEnabled=' + String(state.bridgeRecognizerEnabled) +
        ' bridgeRecognizerState=' + String(state.bridgeRecognizerState) +
        ' panGateSessionActive=' + !!state.panGateSessionActive +
        ' recognizer=' + String(state.recognizerName || '');
    } catch (e) {
      return 'stateError=' + String(e);
    }
  }

  function panReader(dx, dy) {
    var studyController = getStudyController();
    if (!studyController || typeof DocumentScrollController === 'undefined') {
      return false;
    }

    return DocumentScrollController.panStudyView(studyController, dx, dy);
  }

  function probeMindMapBoxSelect() {
    var studyController = getStudyController();
    if (!studyController || typeof MindMapBoxSelectController === 'undefined') {
      logMindMapDebug('probe', 'skip reason=missing-controller-or-study');
      return false;
    }

    logMindMapDebug('probe', 'begin ' + mindMapStateText(studyController));
    var ok = MindMapBoxSelectController.startCalibration(studyController);
    refreshDebugPanel();
    logMindMapDebug('probe', 'end ok=' + ok + ' ' + mindMapStateText(studyController));
    return ok;
  }

  function toggleMindMapBoxSelect() {
    var studyController = getStudyController();
    if (!studyController || typeof MindMapBoxSelectController === 'undefined') {
      logMindMapDebug('box-toggle', 'skip reason=missing-controller-or-study');
      return false;
    }

    logMindMapDebug('box-toggle', 'begin ' + mindMapStateText(studyController));
    var ok = MindMapBoxSelectController.toggleBoxSelectMode(studyController);
    refreshDebugPanel();
    logMindMapDebug('box-toggle', 'end ok=' + ok + ' ' + mindMapStateText(studyController));
    return ok;
  }

  function toggleMindMapFreeMove() {
    var studyController = getStudyController();
    if (!studyController || typeof MindMapBoxSelectController === 'undefined') {
      logMindMapDebug('free-move-toggle', 'skip reason=missing-controller-or-study');
      return false;
    }

    logMindMapDebug('free-move-toggle', 'begin ' + mindMapStateText(studyController));
    var state = MindMapBoxSelectController.getDebugState(studyController);
    var ok = state.freeMoveActive
      ? MindMapBoxSelectController.restoreBoxSelect(studyController)
      : MindMapBoxSelectController.enableFreeMove(studyController);
    refreshDebugPanel();
    logMindMapDebug('free-move-toggle', 'end ok=' + ok + ' ' + mindMapStateText(studyController));
    return ok;
  }

  return {
    onTestPanUp: function () {
      return panReader(0, -DocumentScrollController.DEFAULT_PAN_STEP);
    },
    onTestPanDown: function () {
      return panReader(0, DocumentScrollController.DEFAULT_PAN_STEP);
    },
    onTestPanLeft: function () {
      return panReader(-DocumentScrollController.DEFAULT_PAN_STEP, 0);
    },
    onTestPanRight: function () {
      return panReader(DocumentScrollController.DEFAULT_PAN_STEP, 0);
    },
    onProbeMindMapBoxSelect: function () {
      return probeMindMapBoxSelect();
    },
    onToggleMindMapBoxSelect: function () {
      return toggleMindMapBoxSelect();
    },
    onToggleMindMapFreeMove: function () {
      return toggleMindMapFreeMove();
    },
  };
}
