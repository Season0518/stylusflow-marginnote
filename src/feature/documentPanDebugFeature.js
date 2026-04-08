function documentPanDebugFeature() {
  function getStudyController() {
    return Application.sharedInstance().studyController(self.window);
  }

  function panReader(dx, dy) {
    var studyController = getStudyController();
    if (!studyController || typeof DocumentScrollController === 'undefined') {
      console.log('[StylusFlow] 文档平移失败：控制器不可用');
      return false;
    }

    var ok = DocumentScrollController.panStudyView(studyController, dx, dy);
    console.log('[StylusFlow] 文档平移 dx=' + String(dx) + ', dy=' + String(dy) + ', ok=' + String(ok));
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
  };
}
