function createToolPickerPanel(addon) {
  const PANEL_W = 320;
  const PANEL_H = 460;
  const TITLE_H = 42;
  const TAB_H = 36;
  const CONTENT_H = PANEL_H - TITLE_H - TAB_H;
  const ALIGN_LEFT = 0;

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
  titleLabel.text = 'StylusFlow · Tool Panel';
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

  const tabLabels = ['Tools', 'Debug'];
  const tabBtns = [];
  const tabW = PANEL_W / tabLabels.length;

  for (let ti = 0; ti < tabLabels.length; ti++) {
    const tb = UIButton.buttonWithType(0);
    tb.frame = { x: ti * tabW, y: 0, width: tabW, height: TAB_H };
    tb.setTitleForState(tabLabels[ti], 0);
    tb.titleLabel.font = UIFont.systemFontOfSize(13);
    tb.tag = ti;
    tb.addTargetActionForControlEvents(addon, 'onTabSwitch:', 1 << 6);
    tabBar.addSubview(tb);
    tabBtns.push(tb);
  }

  const toolsPane = new UIView({ x: 0, y: TITLE_H + TAB_H, width: PANEL_W, height: CONTENT_H });
  toolsPane.backgroundColor = UIColor.colorWithWhiteAlpha(0.98, 1);

  const scanBtn = UIButton.buttonWithType(0);
  scanBtn.frame = { x: 10, y: 10, width: PANEL_W - 20, height: 36 };
  scanBtn.setTitleForState('Scan Tools', 0);
  scanBtn.setTitleColorForState(UIColor.whiteColor(), 0);
  scanBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.35, 1);
  scanBtn.titleLabel.font = UIFont.systemFontOfSize(13);
  scanBtn.layer.cornerRadius = 7;
  scanBtn.layer.masksToBounds = true;
  scanBtn.addTargetActionForControlEvents(addon, 'onScanTools:', 1 << 6);
  toolsPane.addSubview(scanBtn);

  const toolsScroll = new UIScrollView({ x: 0, y: 56, width: PANEL_W, height: CONTENT_H - 56 });
  toolsScroll.alwaysBounceVertical = true;
  toolsPane.addSubview(toolsScroll);

  const debugPane = new UIView({ x: 0, y: TITLE_H + TAB_H, width: PANEL_W, height: CONTENT_H });
  debugPane.backgroundColor = UIColor.whiteColor();
  debugPane.hidden = true;

  const debugScroll = new UIScrollView({ x: 0, y: 0, width: PANEL_W, height: CONTENT_H });
  debugScroll.alwaysBounceVertical = true;
  debugPane.addSubview(debugScroll);

  rootView.addSubview(titleBar);
  rootView.addSubview(tabBar);
  rootView.addSubview(toolsPane);
  rootView.addSubview(debugPane);

  let picker = null;
  let tools = [];
  let debugData = null;
  const expandedIndices = {};

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

  function clearSubviews(scrollView) {
    const subs = scrollView.subviews;
    if (!subs) return;
    for (let i = 0; i < subs.length; i++) subs[i].removeFromSuperview();
  }

  function applyTabStyle(activeIdx) {
    tabBtns.forEach((btn, idx) => {
      const active = idx === activeIdx;
      btn.backgroundColor = active
        ? UIColor.colorWithWhiteAlpha(1, 1)
        : UIColor.colorWithWhiteAlpha(0.9, 1);
      btn.setTitleColorForState(active ? UIColor.darkGrayColor() : UIColor.lightGrayColor(), 0);
    });
  }

  function ensurePicker() {
    if (picker) return;
    const app = Application.sharedInstance();
    const sc = app.studyController(addon.window);
    if (sc && sc.view) picker = CanvasToolController.find(sc.view);
  }

  function renderTools() {
    clearSubviews(toolsScroll);

    if (!tools.length) {
      const lbl = new UILabel({ x: 0, y: 20, width: PANEL_W, height: 30 });
      lbl.text = 'No tools found';
      lbl.textAlignment = 1;
      lbl.textColor = UIColor.lightGrayColor();
      lbl.font = UIFont.systemFontOfSize(13);
      toolsScroll.addSubview(lbl);
      toolsScroll.contentSize = { width: PANEL_W, height: 70 };
      return;
    }

    const PAD = 10;
    const ROW_H = 44;
    let y = 8;

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      let cls;
      try {
        cls = CanvasToolController.tryGetClassName(tool.view);
      } catch (e) {
        cls = 'UIControl';
      }

      const row = new UIView({ x: PAD, y, width: PANEL_W - PAD * 2, height: ROW_H });
      row.backgroundColor = UIColor.colorWithWhiteAlpha(0.94, 1);
      row.layer.cornerRadius = 7;
      row.layer.masksToBounds = true;
      row.layer.borderWidth = 0.5;
      row.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.3);

      const slotLbl = new UILabel({ x: 10, y: 0, width: 50, height: ROW_H });
      slotLbl.text = `Slot ${tool.slotIndex}`;
      slotLbl.font = UIFont.systemFontOfSize(11);
      slotLbl.textColor = UIColor.lightGrayColor();

      const clsLbl = new UILabel({ x: 64, y: 0, width: PANEL_W - PAD * 2 - 64 - 62, height: ROW_H });
      clsLbl.text = cls;
      clsLbl.font = UIFont.boldSystemFontOfSize(12);
      clsLbl.textColor = UIColor.darkGrayColor();

      const actBtn = UIButton.buttonWithType(0);
      actBtn.frame = { x: PANEL_W - PAD * 2 - 56, y: (ROW_H - 28) / 2, width: 52, height: 28 };
      actBtn.setTitleForState('Activate', 0);
      actBtn.setTitleColorForState(UIColor.whiteColor(), 0);
      actBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.4, 1);
      actBtn.titleLabel.font = UIFont.systemFontOfSize(12);
      actBtn.layer.cornerRadius = 6;
      actBtn.layer.masksToBounds = true;
      actBtn.tag = i;
      actBtn.addTargetActionForControlEvents(addon, 'onActivateTool:', 1 << 6);

      row.addSubview(slotLbl);
      row.addSubview(clsLbl);
      row.addSubview(actBtn);
      toolsScroll.addSubview(row);
      y += ROW_H + 6;
    }

    toolsScroll.contentSize = { width: PANEL_W, height: y + 8 };
  }

  function renderDebug() {
    clearSubviews(debugScroll);

    if (!debugData) {
      const lbl = new UILabel({ x: 0, y: 20, width: PANEL_W, height: 30 });
      lbl.text = 'No debug data';
      lbl.textAlignment = 1;
      lbl.textColor = UIColor.lightGrayColor();
      lbl.font = UIFont.systemFontOfSize(13);
      debugScroll.addSubview(lbl);
      debugScroll.contentSize = { width: PANEL_W, height: 70 };
      return;
    }

    const PAD = 10;
    const ROW_H = 20;
    let y = 8;

    function addRow(key, value, indent) {
      const xOff = PAD + indent * 16;
      const keyLbl = new UILabel({ x: xOff, y, width: 100, height: ROW_H });
      keyLbl.text = key;
      keyLbl.font = UIFont.boldSystemFontOfSize(11);
      keyLbl.textColor = UIColor.darkGrayColor();
      debugScroll.addSubview(keyLbl);

      let valueStr = value === null || value === undefined ? 'null' : String(value);
      if (valueStr.length > 36) valueStr = `${valueStr.slice(0, 36)}...`;
      const valueLbl = new UILabel({ x: xOff + 104, y, width: PANEL_W - xOff - 104 - PAD, height: ROW_H });
      valueLbl.text = valueStr;
      valueLbl.font = UIFont.systemFontOfSize(11);
      valueLbl.textColor = UIColor.lightGrayColor();
      debugScroll.addSubview(valueLbl);

      y += ROW_H + 2;
    }

    addRow('isVisible', debugData.isVisible, 0);
    addRow('toolCount', debugData.toolCount, 0);

    const debugTools = debugData.tools || [];
    for (let i = 0; i < debugTools.length; i++) {
      const tool = debugTools[i];
      const expanded = !!expandedIndices[i];

      const tBtn = UIButton.buttonWithType(0);
      tBtn.frame = { x: PAD, y, width: PANEL_W - PAD * 2, height: 26 };
      tBtn.setTitleForState(`${expanded ? 'v ' : '> '}[${i}] ${tool.cls}  Slot ${tool.slotIndex}`, 0);
      tBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
      tBtn.titleLabel.font = UIFont.boldSystemFontOfSize(12);
      tBtn.contentHorizontalAlignment = ALIGN_LEFT;
      tBtn.contentEdgeInsets = { top: 0, left: 6, bottom: 0, right: 0 };
      tBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
      tBtn.layer.cornerRadius = 5;
      tBtn.layer.masksToBounds = true;
      tBtn.tag = i;
      tBtn.addTargetActionForControlEvents(addon, 'onDebugToggle:', 1 << 6);
      debugScroll.addSubview(tBtn);
      y += 30;

      if (expanded && tool.view && typeof tool.view === 'object') {
        const keys = Object.keys(tool.view);
        for (let k = 0; k < Math.min(keys.length, 30); k++) {
          addRow(keys[k], tool.view[keys[k]], 1);
        }
        if (keys.length > 30) addRow('...', `(${keys.length} keys total)`, 1);
      }
    }

    debugScroll.contentSize = { width: PANEL_W, height: y + 8 };
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
    toolsPane.hidden = idx !== 0;
    debugPane.hidden = idx !== 1;
    applyTabStyle(idx);
  }

  function scan() {
    ensurePicker();
    tools = picker ? CanvasToolController.detectAllTools(picker) : [];
    renderTools();
  }

  function activateTool(idx) {
    if (tools && tools[idx]) CanvasToolController.activate(tools[idx].view);
  }

  function refreshDebug() {
    ensurePicker();
    const currentTools = picker ? CanvasToolController.detectAllTools(picker) : [];
    debugData = {
      isVisible: CanvasToolController.isVisible(picker),
      toolCount: currentTools.length,
      tools: currentTools.map((tool, index) => {
        let cls;
        try {
          cls = CanvasToolController.tryGetClassName(tool.view);
        } catch (e) {
          cls = 'UIControl';
        }
        return {
          index,
          slotIndex: tool.slotIndex,
          cls,
          view: NativeSerializer.serialize(tool.view),
        };
      }),
    };
    renderDebug();
  }

  function toggleDebugItem(idx) {
    expandedIndices[idx] = !expandedIndices[idx];
    renderDebug();
  }

  applyTabStyle(0);

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
  };
}
