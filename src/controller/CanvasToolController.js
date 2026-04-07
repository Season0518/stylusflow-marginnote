// 负责在 iOS view 层级中定位 CanvasToolPicker 并激活工具
const CanvasToolController = (() => {
  const PICKER_CLASS = 'CanvasToolPicker';
  const TOUCH_UP_INSIDE = 1 << 6;
  const TOUCH_DOWN = 1 << 0;

  // BFS 查找 CanvasToolPicker
  function find(rootWindow) {
    return UIViewTree.findNodeByClass(rootWindow, PICKER_CLASS);
  }

  // 收集 picker 内所有可见工具控件，按从左到右排序
  function detectAllTools(picker) {
    if (!picker) return [];
    var controls = UIViewTree.collectVisibleActionControls(picker, 5);
    var wrappers = controls.map(function (ctrl) {
      return { view: ctrl, x: UIViewTree.getAbsoluteX(ctrl, picker) };
    });
    wrappers.sort(function (a, b) { return a.x - b.x; });
    return wrappers.map(function (w, m) { return { slotIndex: m, view: w.view }; });
  }

  // 触发工具激活
  function activate(toolView) {
    if (!toolView) return false;
    try { toolView.sendActionsForControlEvents(TOUCH_UP_INSIDE); return true; } catch (e) {}
    try { toolView.sendActionsForControlEvents(TOUCH_DOWN); return true; } catch (e) {}
    return false;
  }

  return {
    find: find,
    isVisible: UIViewTree.isVisible,
    detectAllTools: detectAllTools,
    activate: activate,
    tryGetClassName: UIViewTree.getClassName,
  };
})();
