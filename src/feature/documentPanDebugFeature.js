function documentPanDebugFeature(ctx) {
  function getStudyController() {
    return Application.sharedInstance().studyController(self.window);
  }

  function refreshDebugPanel() {
    if (ctx && ctx.panel && ctx.panel.isMounted()) ctx.panel.refreshDebug();
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
    if (!studyController || typeof MindMapBoxSelectController === 'undefined') return false;

    var ok = MindMapBoxSelectController.startCalibration(studyController);
    refreshDebugPanel();
    return ok;
  }

  function toggleMindMapBoxSelect() {
    var studyController = getStudyController();
    if (!studyController || typeof MindMapBoxSelectController === 'undefined') return false;

    var ok = MindMapBoxSelectController.toggleBoxSelectMode(studyController);
    refreshDebugPanel();
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
  };
}
