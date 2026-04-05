JSB.require('controller/CanvasToolController');
JSB.require('ui/NativeSerializer');
JSB.require('ui/panel/ShortcutsPane');
JSB.require('ui/panel/DebugPane');
JSB.require('ui/ToolPickerPanel');
JSB.require('MNStylusFlowAddon');

JSB.newAddon = function (mainPath) {
  return createMNStylusFlowAddon(mainPath);
};
