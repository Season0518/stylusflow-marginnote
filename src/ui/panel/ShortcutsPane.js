function createShortcutsPane(config) {
  const panelWidth = config.panelWidth;
  const originY = config.originY;
  const contentHeight = config.contentHeight;
  const addon = config.addon;

  const pane = new UIView({ x: 0, y: originY, width: panelWidth, height: contentHeight });
  pane.backgroundColor = UIColor.colorWithWhiteAlpha(0.98, 1);

  const scroll = new UIScrollView({ x: 0, y: 0, width: panelWidth, height: contentHeight });
  scroll.alwaysBounceVertical = true;
  pane.addSubview(scroll);

  const cycleShortcutItems = [
    { title: '切换上一个工具', key: '未设置' },
    { title: '切换下一个工具', key: '未设置' },
  ];

  const targetToolItems = [
    { title: '切换套索', key: '未设置' },
    { title: '切换橡皮擦', key: '未设置' },
    { title: '切换拖拽工具', key: '未设置' },
  ];

  for (let i = 1; i <= 8; i++) {
    targetToolItems.push({ title: `切换到工具 ${i}`, key: '未设置' });
  }

  let targetToolsExpanded = false;

  function clearSubviews(scrollView) {
    const subs = scrollView.subviews;
    if (!subs) return;
    for (let i = 0; i < subs.length; i++) subs[i].removeFromSuperview();
  }

  function addHint(text, y, height) {
    const hint = new UILabel({ x: 12, y, width: panelWidth - 24, height });
    hint.text = text;
    hint.font = UIFont.systemFontOfSize(11);
    hint.textColor = UIColor.lightGrayColor();
    scroll.addSubview(hint);
  }

  function addKeyBadge(row, keyText, x, y, width, height) {
    const keyBadge = new UIView({ x, y, width, height });
    keyBadge.backgroundColor = UIColor.colorWithWhiteAlpha(0.88, 1);
    keyBadge.layer.cornerRadius = 6;
    keyBadge.layer.masksToBounds = true;
    keyBadge.layer.borderWidth = 0.5;
    keyBadge.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.45);

    const keyLbl = new UILabel({ x: 0, y: 0, width, height });
    keyLbl.text = keyText;
    keyLbl.textAlignment = 1;
    keyLbl.font = UIFont.systemFontOfSize(11);
    keyLbl.textColor = UIColor.darkGrayColor();
    keyBadge.addSubview(keyLbl);
    row.addSubview(keyBadge);
  }

  function addShortcutRows(items, startY, options) {
    const opts = options || {};
    const PAD = 10;
    const ROW_H = opts.compact ? 42 : 46;
    const KEY_W = 86;
    const LEFT_PAD = opts.indent || 12;
    const TITLE_W = panelWidth - PAD * 2 - KEY_W - (opts.compact ? 40 : 26);
    let y = startY;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const row = new UIView({ x: PAD, y, width: panelWidth - PAD * 2, height: ROW_H });
      row.backgroundColor = opts.compact
        ? UIColor.colorWithWhiteAlpha(0.965, 1)
        : UIColor.colorWithWhiteAlpha(0.95, 1);
      row.layer.cornerRadius = 7;
      row.layer.masksToBounds = true;
      row.layer.borderWidth = 0.5;
      row.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.35);

      const titleLbl = new UILabel({ x: LEFT_PAD, y: 0, width: TITLE_W, height: ROW_H });
      titleLbl.text = item.title;
      titleLbl.font = opts.compact ? UIFont.systemFontOfSize(12) : UIFont.boldSystemFontOfSize(12);
      titleLbl.textColor = UIColor.darkGrayColor();
      row.addSubview(titleLbl);

      const badgeH = opts.compact ? 24 : 28;
      const badgeY = (ROW_H - badgeH) / 2;
      addKeyBadge(row, item.key, panelWidth - PAD * 2 - KEY_W - 8, badgeY, KEY_W, badgeH);

      scroll.addSubview(row);
      y += ROW_H + (opts.compact ? 4 : 6);
    }

    scroll.contentSize = { width: panelWidth, height: y + 6 };
    return y;
  }

  function addTargetToolsTab(y) {
    const PAD = 10;
    const ROW_H = 42;

    const row = new UIView({ x: PAD, y, width: panelWidth - PAD * 2, height: ROW_H });
    row.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    row.layer.cornerRadius = 7;
    row.layer.masksToBounds = true;
    row.layer.borderWidth = 0.5;
    row.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.4);

    const titleLbl = new UILabel({ x: 12, y: 0, width: panelWidth - PAD * 2 - 40, height: ROW_H });
    titleLbl.text = '指定工具切换';
    titleLbl.font = UIFont.boldSystemFontOfSize(12);
    titleLbl.textColor = UIColor.darkGrayColor();
    row.addSubview(titleLbl);

    const indicatorLbl = new UILabel({ x: panelWidth - PAD * 2 - 24, y: 0, width: 16, height: ROW_H });
    indicatorLbl.text = targetToolsExpanded ? 'v' : '>';
    indicatorLbl.textAlignment = 1;
    indicatorLbl.font = UIFont.boldSystemFontOfSize(12);
    indicatorLbl.textColor = UIColor.grayColor();
    row.addSubview(indicatorLbl);

    const hitBtn = UIButton.buttonWithType(0);
    hitBtn.frame = { x: 0, y: 0, width: panelWidth - PAD * 2, height: ROW_H };
    hitBtn.addTargetActionForControlEvents(addon, 'onToggleDirectToolsTab:', 1 << 6);
    row.addSubview(hitBtn);

    scroll.addSubview(row);
    return y + ROW_H + 4;
  }

  function render() {
    clearSubviews(scroll);
    addHint('快捷键设置（仅 UI，后续接入真实绑定）', 8, 20);

    let y = 32;
    y = addTargetToolsTab(y);

    if (targetToolsExpanded) {
      y = addShortcutRows(targetToolItems, y, { compact: true, indent: 20 });
      y += 4;
    }

    addShortcutRows(cycleShortcutItems, y, { compact: false, indent: 12 });
  }

  function renderWithLightTransition() {
    try {
      CATransaction.begin();
      CATransaction.setAnimationDuration(0.14);
      CATransaction.setDisableActions(false);
      scroll.alpha = 0.9;
      render();
      scroll.alpha = 1;
      CATransaction.commit();
    } catch (e) {
      scroll.alpha = 1;
      render();
    }
  }

  function toggleDirectToolsTab() {
    targetToolsExpanded = !targetToolsExpanded;
    renderWithLightTransition();
  }

  render();

  return {
    view: pane,
    onShow: render,
    toggleDirectToolsTab,
  };
}
