// iOS 平台实现：定位 CanvasToolPicker 并激活工具
const CanvasToolBridge = (function () {
  var PICKER_CLASS = 'CanvasToolPicker';

  function find(rootWindow) {
    return UIViewTree.findNodeByClass(rootWindow, PICKER_CLASS);
  }

  function detectAllTools(picker) {
    if (!picker) return [];
    var controls = UIViewTree.collectVisibleActionControls(picker, 5);
    var wrappers = controls.map(function (ctrl) {
      return { view: ctrl, x: UIViewTree.getAbsoluteX(ctrl, picker) };
    });
    wrappers.sort(function (a, b) { return a.x - b.x; });
    return wrappers.map(function (w, i) { return { slotIndex: i, view: w.view }; });
  }

  function activate(toolView) {
    return UIViewTree.triggerTouch(toolView);
  }

  function detectActiveSlot(picker) {
    var tools = detectAllTools(picker);
    for (var i = 0; i < tools.length; i++) {
      try { if (tools[i].view.selected) return i; } catch (e) {}
    }
    return -1;
  }

  return { find: find, detectAllTools: detectAllTools, activate: activate, detectActiveSlot: detectActiveSlot };
})();
