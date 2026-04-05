JSB.require('controller/CanvasToolController');
JSB.require('ui/NativeSerializer');
JSB.require('ui/ToolPickerPanel');
JSB.require('MNStylusFlowAddon');

JSB.newAddon = function (mainPath) {
  return createMNStylusFlowAddon(mainPath);
};
