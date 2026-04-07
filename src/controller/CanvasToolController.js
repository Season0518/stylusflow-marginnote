// Canvas 工具控制器 facade：实现细节见 canvastool/CanvasToolBridge.js
const CanvasToolController = (function () {
  return {
    find:            CanvasToolBridge.find,
    detectAllTools:  CanvasToolBridge.detectAllTools,
    activate:        CanvasToolBridge.activate,
    isVisible:       UIViewTree.isVisible,
    tryGetClassName: UIViewTree.getClassName,
  };
})();
