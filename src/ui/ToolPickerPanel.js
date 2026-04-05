function createToolPickerPanel(addon) {
  const PANEL_W = 320;
  const PANEL_H = 460;
  const TITLE_H = 42;
  const TAB_H = 36;
  const CONTENT_H = PANEL_H - TITLE_H - TAB_H;
  const ALIGN_LEFT = 0;
  const TAB_SHORTCUTS = 0;
  const TAB_DEBUG = 1;

  const rootView = new UIView({ x: 80, y: 80, width: PANEL_W, height: PANEL_H });
  rootView.backgroundColor = UIColor.colorWithWhiteAlpha(0.98, 1);
  rootView.userInteractionEnabled = true;
  rootView.layer.cornerRadius = 10;
  rootView.layer.masksToBounds = true;
  rootView.layer.borderWidth = 0.5;
  rootView.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.4);

  const titleBar = new UIView({ x: 0, y: 0, width: PANEL_W, height: TITLE_H });
  titleBar.backgroundColor = UIColor.colorWithWhiteAlpha(0.2, 1);

  const titleLabel = new UILabel({ x: 12, y: 0, width: PANEL_W - 56, height: TITLE_H });
  titleLabel.text = 'StylusFlow';
  titleLabel.font = UIFont.boldSystemFontOfSize(13);
  titleLabel.textColor = UIColor.whiteColor();

  const closeBtn = UIButton.buttonWithType(0);
  closeBtn.frame = { x: PANEL_W - 44, y: 7, width: 36, height: TITLE_H - 14 };
  closeBtn.setTitleForState('x', 0);
  closeBtn.setTitleColorForState(UIColor.colorWithWhiteAlpha(0.7, 1), 0);
  closeBtn.titleLabel.font = UIFont.systemFontOfSize(15);
  closeBtn.addTargetActionForControlEvents(addon, 'onPanelClose:', 1 << 6);

  titleBar.addSubview(titleLabel);
  titleBar.addSubview(closeBtn);

  const panRecognizer = new UIPanGestureRecognizer(addon, 'onPanelPan:');
  titleBar.addGestureRecognizer(panRecognizer);

  const tabBar = new UIView({ x: 0, y: TITLE_H, width: PANEL_W, height: TAB_H });
  tabBar.backgroundColor = UIColor.colorWithWhiteAlpha(0.9, 1);

  const tabLabels = ['快捷键', '调试'];
  const tabBtns = [];
  const tabW = PANEL_W / tabLabels.length;

  for (let i = 0; i < tabLabels.length; i++) {
    const tabBtn = UIButton.buttonWithType(0);
    tabBtn.frame = { x: i * tabW, y: 0, width: tabW, height: TAB_H };
    tabBtn.setTitleForState(tabLabels[i], 0);
    tabBtn.titleLabel.font = UIFont.systemFontOfSize(13);
    tabBtn.tag = i;
    tabBtn.addTargetActionForControlEvents(addon, 'onTabSwitch:', 1 << 6);
    tabBar.addSubview(tabBtn);
    tabBtns.push(tabBtn);
  }

  const shortcutsPaneCtrl = createShortcutsPane({
    panelWidth: PANEL_W,
    originY: TITLE_H + TAB_H,
    contentHeight: CONTENT_H,
    addon,
  });

  const debugPaneCtrl = createDebugPane({
    panelWidth: PANEL_W,
    originY: TITLE_H + TAB_H,
    contentHeight: CONTENT_H,
    alignLeft: ALIGN_LEFT,
    addon,
  });

  const shortcutsPane = shortcutsPaneCtrl.view;
  const debugPane = debugPaneCtrl.view;

  rootView.addSubview(titleBar);
  rootView.addSubview(tabBar);
  rootView.addSubview(shortcutsPane);
  rootView.addSubview(debugPane);

  let picker = null;
  let tools = [];

  function getSafeBounds(bounds) {
    if (bounds && bounds.width > 0 && bounds.height > 0) return bounds;
    if (rootView.superview && rootView.superview.bounds) return rootView.superview.bounds;
    return { x: 0, y: 0, width: 1024, height: 768 };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampFrame(frame, bounds) {
    const b = getSafeBounds(bounds);
    return {
      x: clamp(frame.x, b.x, b.x + b.width - PANEL_W),
      y: clamp(frame.y, b.y, b.y + b.height - PANEL_H),
      width: PANEL_W,
      height: PANEL_H,
    };
  }

  function applyTabStyle(activeIdx) {
    tabBtns.forEach((btn, idx) => {
      const isActive = idx === activeIdx;
      btn.backgroundColor = isActive
        ? UIColor.colorWithWhiteAlpha(1, 1)
        : UIColor.colorWithWhiteAlpha(0.9, 1);
      btn.setTitleColorForState(isActive ? UIColor.darkGrayColor() : UIColor.lightGrayColor(), 0);
    });
  }

  function ensurePicker() {
    if (picker) return;
    const app = Application.sharedInstance();
    const sc = app.studyController(addon.window);
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
    const toolList = currentTools || [];
    return {
      isVisible: CanvasToolController.isVisible(picker),
      toolCount: toolList.length,
      shortcuts: ShortcutController.getDebugState(),
      tools: toolList.map((tool, index) => ({
        index,
        slotIndex: tool.slotIndex,
        actionId: `tool.${tool.slotIndex + 1}`,
        cls: CanvasToolController.tryGetClassName(tool.view),
        view: NativeSerializer.serialize(tool.view),
      })),
    };
  }

  function isMounted() {
    return !!rootView.superview;
  }

  function mount(hostView) {
    if (!hostView || isMounted()) return;
    hostView.addSubview(rootView);
    rootView.frame = clampFrame(rootView.frame, hostView.bounds);
  }

  function unmount() {
    if (rootView.superview && rootView.removeFromSuperview) rootView.removeFromSuperview();
  }

  function relayoutWithinBounds(bounds) {
    if (!bounds) return;
    rootView.frame = clampFrame(rootView.frame, getSafeBounds(bounds));
  }

  function handlePan(recognizer) {
    if (!rootView.superview) return;
    const superBounds = getSafeBounds(rootView.superview.bounds);
    const translation = recognizer.translationInView(rootView.superview);
    const center = rootView.center;
    const frame = rootView.frame;
    rootView.center = {
      x: clamp(center.x + translation.x, superBounds.x + frame.width / 2, superBounds.x + superBounds.width - frame.width / 2),
      y: clamp(center.y + translation.y, superBounds.y + frame.height / 2, superBounds.y + superBounds.height - frame.height / 2),
    };
    recognizer.setTranslationInView({ x: 0, y: 0 }, rootView.superview);
  }

  function switchTab(idx) {
    shortcutsPane.hidden = idx !== TAB_SHORTCUTS;
    debugPane.hidden = idx !== TAB_DEBUG;
    if (idx === TAB_SHORTCUTS) {
      collectTools();
      shortcutsPaneCtrl.updateBindings(ShortcutController.getBindingLabelMap());
    }
    if (idx === TAB_DEBUG) debugPaneCtrl.onShow();
    applyTabStyle(idx);
  }

  function scan() {
    const currentTools = collectTools();
    debugPaneCtrl.updateData(buildDebugData(currentTools));
  }

  function activateTool(idx) {
    if (!tools[idx]) collectTools();
    if (tools && tools[idx]) CanvasToolController.activate(tools[idx].view);
  }

  function refreshDebug() {
    const currentTools = collectTools();
    debugPaneCtrl.updateData(buildDebugData(currentTools));
  }

  function toggleDebugItem(idx) {
    debugPaneCtrl.toggleItem(idx);
  }

  function refreshShortcutBindings() {
    shortcutsPaneCtrl.updateBindings(ShortcutController.getBindingLabelMap());
  }

  function handleShortcutBindingTap(tag) {
    return shortcutsPaneCtrl.handleBindingTap(tag);
  }

  function handleShortcutEditorModifierTap(tag) {
    return shortcutsPaneCtrl.handleEditorModifierTap(tag);
  }

  function handleShortcutEditorCancel() {
    return shortcutsPaneCtrl.handleEditorCancel();
  }

  function handleShortcutEditorClear() {
    return shortcutsPaneCtrl.handleEditorClear();
  }

  function handleShortcutEditorSave() {
    return shortcutsPaneCtrl.handleEditorSave();
  }

  switchTab(TAB_SHORTCUTS);

  return {
    mount,
    unmount,
    isMounted,
    relayoutWithinBounds,
    handlePan,
    switchTab,
    scan,
    activateTool,
    refreshDebug,
    toggleDebugItem,
    toggleDirectToolsTab: () => shortcutsPaneCtrl.toggleDirectToolsTab(),
    refreshShortcutBindings,
    handleShortcutBindingTap,
    handleShortcutEditorModifierTap,
    handleShortcutEditorCancel,
    handleShortcutEditorClear,
    handleShortcutEditorSave,
  };
}
