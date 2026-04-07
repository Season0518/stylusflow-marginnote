// 面板逻辑协调器：挂载/卸载、拖拽、标签切换、工具扫描
function createToolPickerPanel(addon) {
  var PANEL_W = ToolPickerView.PANEL_W;
  var PANEL_H = ToolPickerView.PANEL_H;
  var TAB_SHORTCUTS = 0;
  var TAB_DEBUG = 1;

  var view = ToolPickerView.build(addon);
  var rootView = view.rootView;
  var CONTENT_H = PANEL_H - view.TITLE_H - view.TAB_H;

  var shortcutsPaneCtrl = createShortcutsPane({
    panelWidth: PANEL_W,
    originY: view.TITLE_H + view.TAB_H,
    contentHeight: CONTENT_H,
    addon: addon,
  });

  var debugPaneCtrl = createDebugPane({
    panelWidth: PANEL_W,
    originY: view.TITLE_H + view.TAB_H,
    contentHeight: CONTENT_H,
    alignLeft: 0,
    addon: addon,
  });

  rootView.addSubview(shortcutsPaneCtrl.view);
  rootView.addSubview(debugPaneCtrl.view);

  var picker = null;
  var tools = [];

  function ensurePicker() {
    if (picker) return;
    var app = Application.sharedInstance();
    var sc = app.studyController(addon.window);
    if (sc && sc.view) picker = CanvasToolController.find(sc.view);
  }

  function collectTools() {
    ensurePicker();
    tools = picker ? CanvasToolController.detectAllTools(picker) : [];
    if (ShortcutController.syncToolCount(tools.length)) {
      shortcutsPaneCtrl.updateBindings(ShortcutController.getBindingLabelMap());
    }
    return tools;
  }

  function buildDebugData(currentTools) {
    var toolList = currentTools || [];
    return {
      isVisible: CanvasToolController.isVisible(picker),
      toolCount: toolList.length,
      shortcuts: ShortcutController.getDebugState(),
      tools: toolList.map(function (tool, index) {
        return {
          index: index,
          slotIndex: tool.slotIndex,
          actionId: 'tool.' + (tool.slotIndex + 1),
          cls: CanvasToolController.tryGetClassName(tool.view),
          view: NativeSerializer.serialize(tool.view),
        };
      }),
    };
  }

  function isMounted() { return !!rootView.superview; }

  function mount(hostView) {
    if (!hostView || isMounted()) return;
    hostView.addSubview(rootView);
    rootView.frame = ToolPickerView.clampFrame(rootView, rootView.frame, hostView.bounds);
  }

  function unmount() {
    if (rootView.superview && rootView.removeFromSuperview) rootView.removeFromSuperview();
  }

  function relayoutWithinBounds(bounds) {
    if (!bounds) return;
    rootView.frame = ToolPickerView.clampFrame(rootView, rootView.frame, bounds);
  }

  function handlePan(recognizer) {
    if (!rootView.superview) return;
    var superBounds = ToolPickerView.getSafeBounds(rootView, rootView.superview.bounds);
    var translation = recognizer.translationInView(rootView.superview);
    var center = rootView.center;
    rootView.center = {
      x: ToolPickerView.clamp(center.x + translation.x, superBounds.x + PANEL_W / 2, superBounds.x + superBounds.width - PANEL_W / 2),
      y: ToolPickerView.clamp(center.y + translation.y, superBounds.y + PANEL_H / 2, superBounds.y + superBounds.height - PANEL_H / 2),
    };
    recognizer.setTranslationInView({ x: 0, y: 0 }, rootView.superview);
  }

  function switchTab(idx) {
    shortcutsPaneCtrl.view.hidden = idx !== TAB_SHORTCUTS;
    debugPaneCtrl.view.hidden = idx !== TAB_DEBUG;
    if (idx === TAB_SHORTCUTS) {
      collectTools();
      shortcutsPaneCtrl.updateBindings(ShortcutController.getBindingLabelMap());
    }
    if (idx === TAB_DEBUG) debugPaneCtrl.onShow();
    view.applyTabStyle(idx);
  }

  function scan() {
    debugPaneCtrl.updateData(buildDebugData(collectTools()));
  }

  function activateTool(idx) {
    if (!tools[idx]) collectTools();
    if (tools && tools[idx]) CanvasToolController.activate(tools[idx].view);
  }

  switchTab(TAB_SHORTCUTS);

  return {
    mount: mount,
    unmount: unmount,
    isMounted: isMounted,
    relayoutWithinBounds: relayoutWithinBounds,
    handlePan: handlePan,
    switchTab: switchTab,
    scan: scan,
    activateTool: activateTool,
    refreshDebug: function () { debugPaneCtrl.updateData(buildDebugData(collectTools())); },
    refreshShortcutBindings: function () { shortcutsPaneCtrl.updateBindings(ShortcutController.getBindingLabelMap()); },
    toggleDebugItem: function (idx) { debugPaneCtrl.toggleItem(idx); },
    toggleDirectToolsTab: function () { shortcutsPaneCtrl.toggleDirectToolsTab(); },
    handleShortcutBindingTap: function (tag) { return shortcutsPaneCtrl.handleBindingTap(tag); },
    handleShortcutEditorModifierTap: function (tag) { return shortcutsPaneCtrl.handleEditorModifierTap(tag); },
    handleShortcutEditorCancel: function () { return shortcutsPaneCtrl.handleEditorCancel(); },
    handleShortcutEditorClear: function () { return shortcutsPaneCtrl.handleEditorClear(); },
    handleShortcutEditorSave: function () { return shortcutsPaneCtrl.handleEditorSave(); },
  };
}
