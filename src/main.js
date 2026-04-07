// 加载顺序：依赖在前，使用在后
JSB.require('i18n/strings');
JSB.require('core/UIViewTree');
JSB.require('controller/canvastool/CanvasToolBridge');
JSB.require('controller/CanvasToolController');
JSB.require('controller/shortcut/ShortcutConstants');
JSB.require('controller/shortcut/ShortcutFormatter');
JSB.require('controller/shortcut/ShortcutStorage');
JSB.require('controller/shortcut/ShortcutRegistry');
JSB.require('controller/shortcut/ShortcutBindings');
JSB.require('controller/shortcut/ShortcutRuntime');
JSB.require('controller/ShortcutController');
JSB.require('core/ToolWatcher');
JSB.require('core/ActionProcessor');
JSB.require('ui/NativeSerializer');
JSB.require('ui/panel/shortcut/ShortcutRowBuilder');
JSB.require('ui/panel/shortcut/ShortcutEditorView');
JSB.require('ui/panel/shortcut/ShortcutEditorHandler');
JSB.require('ui/panel/ShortcutsPane');
JSB.require('ui/panel/debug/DebugView');
JSB.require('ui/panel/DebugPane');
JSB.require('ui/ToolPickerView');
JSB.require('ui/ToolPickerPanel');
JSB.require('feature/composeAddonMethods');
JSB.require('feature/lifecycleFeature');
JSB.require('feature/shortcutFeature');
JSB.require('feature/panelEventFeature');
JSB.require('MNStylusFlowAddon');

JSB.newAddon = function (mainPath) {
  return createMNStylusFlowAddon(mainPath);
};
