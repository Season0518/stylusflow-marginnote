// 脑图框选控制器 facade：实现细节见 mindmap/MindMapBoxSelectRuntime.js
const MindMapBoxSelectController = (function () {
  var runtime = createMindMapBoxSelectRuntime();

  return {
    startCalibration: runtime.startCalibration,
    toggleBoxSelectMode: runtime.toggleBoxSelectMode,
    stopBoxSelectMode: runtime.stopBoxSelectMode,
    getDebugState: runtime.getDebugState,
  };
})();
