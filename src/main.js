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
JSB.require('ui/views/shortcuts/components/ShortcutRow');
JSB.require('ui/views/shortcuts/components/ShortcutEditorView');
JSB.require('ui/views/shortcuts/components/ShortcutEditor');
JSB.require('ui/views/shortcuts/ShortcutsView');
JSB.require('ui/views/debug/components/DebugContentView');
JSB.require('ui/views/debug/DebugView');
JSB.require('ui/toolpicker/ToolPickerView');
JSB.require('ui/toolpicker/ToolPickerPanel');
JSB.require('feature/composeAddonMethods');
JSB.require('feature/lifecycleFeature');
JSB.require('feature/shortcutFeature');
JSB.require('feature/panelEventFeature');
JSB.require('MNStylusFlowAddon');

JSB.newAddon = function (mainPath) {
  return createMNStylusFlowAddon(mainPath);
};
