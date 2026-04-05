JSB.require('controller/CanvasToolController');
JSB.require('controller/shortcut/ShortcutConstants');
JSB.require('controller/shortcut/ShortcutFormatter');
JSB.require('controller/shortcut/ShortcutStorage');
JSB.require('controller/shortcut/ShortcutBindings');
JSB.require('controller/shortcut/ShortcutRuntime');
JSB.require('controller/ShortcutController');
JSB.require('ui/NativeSerializer');
JSB.require('ui/panel/ShortcutsPane');
JSB.require('ui/panel/DebugPane');
JSB.require('ui/ToolPickerPanel');
JSB.require('MNStylusFlowAddon');

JSB.newAddon = function (mainPath) {
  return createMNStylusFlowAddon(mainPath);
};
