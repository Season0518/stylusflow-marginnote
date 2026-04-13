// 脑图框选控制器 facade：实现细节见 mindmap/MindMapBoxSelectRuntime.js
const MindMapBoxSelectController = (function () {
  var runtime = createMindMapBoxSelectRuntime();

  return {
    startCalibration: runtime.startCalibration,
    toggleBoxSelectMode: runtime.toggleBoxSelectMode,
    ensureBoxSelectMode: runtime.ensureBoxSelectMode,
    stopBoxSelectMode: runtime.stopBoxSelectMode,
    enableFreeMove: runtime.enableFreeMove,
    restoreBoxSelect: runtime.restoreBoxSelect,
    toggleFreeMove: runtime.toggleFreeMove,
    syncPanGate: runtime.syncPanGate,
    getDebugState: runtime.getDebugState,
  };
})();
