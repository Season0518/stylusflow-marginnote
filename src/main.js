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
JSB.require('controller/DocumentScrollController');
JSB.require('controller/mindmap/MindMapShared');
JSB.require('controller/mindmap/MindMapBoxGestureCollector');
JSB.require('controller/mindmap/MindMapBoxCalibration');
JSB.require('controller/mindmap/MindMapBoxBridge');
JSB.require('controller/mindmap/MindMapBoxSelectRuntime');
JSB.require('controller/MindMapBoxSelectController');
JSB.require('controller/pangate/PanGateConstants');
JSB.require('controller/pangate/PanGateStorage');
JSB.require('controller/pangate/PanGateBindings');
JSB.require('controller/PanGateController');
JSB.require('controller/pangate/PanGesturePool');
JSB.require('controller/pangate/EventInterceptor');
// utils
JSB.require('utils/NativeSerializer');
// ui/components/base
JSB.require('ui/components/base/Card');
JSB.require('ui/components/base/KeyBadge');
JSB.require('ui/components/base/KVRow');
// ui/components/shortcuts
JSB.require('ui/components/shortcuts/BindingRow');
JSB.require('ui/components/shortcuts/SectionHeader');
JSB.require('ui/components/shortcuts/EditorModal');
// ui/components/debug
JSB.require('ui/components/debug/ToolRow');
JSB.require('ui/components/debug/InfoSection');
// ui/views
JSB.require('ui/views/PanelView');
JSB.require('ui/views/ShortcutsPaneView');
JSB.require('ui/views/DebugPaneView');
// ui/containers
JSB.require('ui/containers/ShortcutEditorContainer');
JSB.require('ui/containers/ShortcutsContainer');
JSB.require('ui/containers/DebugContainer');
JSB.require('ui/containers/PanelContainer');
// feature
JSB.require('feature/composeAddonMethods');
JSB.require('feature/lifecycleFeature');
JSB.require('feature/shortcutFeature');
JSB.require('feature/panelEventFeature');
JSB.require('feature/documentPanDebugFeature');
JSB.require('MNStylusFlowAddon');

JSB.newAddon = function (mainPath) {
  return createMNStylusFlowAddon(mainPath);
};
