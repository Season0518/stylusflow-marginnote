// 面板根级协调：挂载/卸载、拖拽、标签切换、工具扫描
function createPanelContainer(addon) {
  var PANEL_W = PanelView.PANEL_W;
  var PANEL_H = PanelView.PANEL_H;
  var TAB_SHORTCUTS = 0;
  var TAB_DEBUG = 1;

  var view = PanelView.build();
  var rootView = view.rootView;
  var CONTENT_H = PANEL_H - view.TITLE_H - view.TAB_H;

  view.closeBtn.addTargetActionForControlEvents(addon, 'onPanelClose:', 1 << 6);
  var panRecognizer = new UIPanGestureRecognizer(addon, 'onPanelPan:');
  view.titleBar.addGestureRecognizer(panRecognizer);
  for (var i = 0; i < view.tabBtns.length; i++) {
    view.tabBtns[i].addTargetActionForControlEvents(addon, 'onTabSwitch:', 1 << 6);
  }

  var shortcutsCtrl = createShortcutsContainer({
    panelWidth: PANEL_W,
    originY: view.TITLE_H + view.TAB_H,
    contentHeight: CONTENT_H,
    addon: addon,
  });

  var debugCtrl = createDebugContainer({
    panelWidth: PANEL_W,
    originY: view.TITLE_H + view.TAB_H,
    contentHeight: CONTENT_H,
    alignLeft: 0,
    addon: addon,
  });

  rootView.addSubview(shortcutsCtrl.view);
  rootView.addSubview(debugCtrl.view);

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
      shortcutsCtrl.updateBindings(ShortcutController.getBindingLabelMap());
    }
    return tools;
  }

  function isMounted() { return !!rootView.superview; }

  function mount(hostView) {
    if (!hostView || isMounted()) return;
    hostView.addSubview(rootView);
    rootView.frame = PanelView.clampFrame(rootView, rootView.frame, hostView.bounds);
  }

  function unmount() {
    if (rootView.superview && rootView.removeFromSuperview) rootView.removeFromSuperview();
  }

  function relayoutWithinBounds(bounds) {
    if (!bounds) return;
    rootView.frame = PanelView.clampFrame(rootView, rootView.frame, bounds);
  }

  function handlePan(recognizer) {
    if (!rootView.superview) return;
    var superBounds = PanelView.getSafeBounds(rootView, rootView.superview.bounds);
    var translation = recognizer.translationInView(rootView.superview);
    var center = rootView.center;
    rootView.center = {
      x: PanelView.clamp(center.x + translation.x, superBounds.x + PANEL_W / 2, superBounds.x + superBounds.width - PANEL_W / 2),
      y: PanelView.clamp(center.y + translation.y, superBounds.y + PANEL_H / 2, superBounds.y + superBounds.height - PANEL_H / 2),
    };
    recognizer.setTranslationInView({ x: 0, y: 0 }, rootView.superview);
  }

  function switchTab(idx) {
    shortcutsCtrl.view.hidden = idx !== TAB_SHORTCUTS;
    debugCtrl.view.hidden = idx !== TAB_DEBUG;
    if (idx === TAB_SHORTCUTS) {
      collectTools();
      shortcutsCtrl.updateBindings(ShortcutController.getBindingLabelMap());
    }
    if (idx === TAB_DEBUG) debugCtrl.onShow();
    view.applyTabStyle(idx);
  }

  switchTab(TAB_SHORTCUTS);

  return {
    mount: mount,
    unmount: unmount,
    isMounted: isMounted,
    relayoutWithinBounds: relayoutWithinBounds,
    handlePan: handlePan,
    switchTab: switchTab,
    scan: function () { debugCtrl.refresh(collectTools(), picker); },
    activateTool: function (idx) {
      if (!tools[idx]) collectTools();
      if (tools && tools[idx]) CanvasToolController.activate(tools[idx].view);
    },
    refreshDebug: function () { debugCtrl.refresh(collectTools(), picker); },
    refreshShortcutBindings: function () { shortcutsCtrl.updateBindings(ShortcutController.getBindingLabelMap()); },
    toggleDebugItem: function (idx) { debugCtrl.toggleItem(idx); },
    toggleDirectToolsTab: function () { shortcutsCtrl.toggleDirectToolsTab(); },
    handleShortcutBindingTap: function (tag) { return shortcutsCtrl.handleBindingTap(tag); },
    handleShortcutEditorModifierTap: function (tag) { return shortcutsCtrl.handleEditorModifierTap(tag); },
    handleShortcutEditorCancel: function () { return shortcutsCtrl.handleEditorCancel(); },
    handleShortcutEditorClear: function () { return shortcutsCtrl.handleEditorClear(); },
    handleShortcutEditorSave: function () { return shortcutsCtrl.handleEditorSave(); },
  };
}
