function createDebugPane(config) {
  const panelWidth = config.panelWidth;
  const originY = config.originY;
  const contentHeight = config.contentHeight;
  const alignLeft = config.alignLeft;
  const addon = config.addon;

  const pane = new UIView({ x: 0, y: originY, width: panelWidth, height: contentHeight });
  pane.backgroundColor = UIColor.whiteColor();
  pane.hidden = true;

  const scanBtn = UIButton.buttonWithType(0);
  scanBtn.frame = { x: 10, y: 10, width: panelWidth - 20, height: 36 };
  scanBtn.setTitleForState('扫描工具', 0);
  scanBtn.setTitleColorForState(UIColor.whiteColor(), 0);
  scanBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.35, 1);
  scanBtn.titleLabel.font = UIFont.systemFontOfSize(13);
  scanBtn.layer.cornerRadius = 7;
  scanBtn.layer.masksToBounds = true;
  scanBtn.addTargetActionForControlEvents(addon, 'onScanTools:', 1 << 6);
  pane.addSubview(scanBtn);

  const scroll = new UIScrollView({ x: 0, y: 56, width: panelWidth, height: contentHeight - 56 });
  scroll.alwaysBounceVertical = true;
  pane.addSubview(scroll);

  const expandedIndices = {};
  let debugData = null;

  function clearSubviews(scrollView) {
    const subs = scrollView.subviews;
    if (!subs) return;
    for (let i = 0; i < subs.length; i++) subs[i].removeFromSuperview();
  }

  function render() {
    clearSubviews(scroll);

    if (!debugData) {
      const lbl = new UILabel({ x: 0, y: 20, width: panelWidth, height: 30 });
      lbl.text = '暂无调试数据';
      lbl.textAlignment = 1;
      lbl.textColor = UIColor.lightGrayColor();
      lbl.font = UIFont.systemFontOfSize(13);
      scroll.addSubview(lbl);
      scroll.contentSize = { width: panelWidth, height: 70 };
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
      scroll.addSubview(keyLbl);

      let valueStr = value === null || value === undefined ? 'null' : String(value);
      if (valueStr.length > 36) valueStr = `${valueStr.slice(0, 36)}...`;
      const valueLbl = new UILabel({ x: xOff + 104, y, width: panelWidth - xOff - 104 - PAD, height: ROW_H });
      valueLbl.text = valueStr;
      valueLbl.font = UIFont.systemFontOfSize(11);
      valueLbl.textColor = UIColor.lightGrayColor();
      scroll.addSubview(valueLbl);

      y += ROW_H + 2;
    }

    addRow('可见状态', debugData.isVisible, 0);
    addRow('工具数量', debugData.toolCount, 0);

    const shortcutState = debugData.shortcuts || {};
    addRow('快捷键绑定', shortcutState.bindingCount || 0, 0);
    addRow('触发次数', shortcutState.triggerCount || 0, 0);
    addRow('最近快捷键', shortcutState.lastShortcut || '无', 0);
    addRow('最近动作', shortcutState.lastActionTitle || '无', 0);
    addRow('最近结果', shortcutState.lastResult || '未触发', 0);
    addRow('最近时间', shortcutState.lastAt || '无', 0);
    addRow('最近绑定项', shortcutState.lastBindingAction || '无', 0);
    addRow('最近绑定值', shortcutState.lastBindingValue || '无', 0);
    addRow('绑定更新时间', shortcutState.lastBindingAt || '无', 0);

    const debugTools = debugData.tools || [];
    for (let i = 0; i < debugTools.length; i++) {
      const tool = debugTools[i];
      const expanded = !!expandedIndices[i];
      const ACTIVATE_W = 64;
      const GAP = 6;

      const tBtn = UIButton.buttonWithType(0);
      tBtn.frame = { x: PAD, y, width: panelWidth - PAD * 2 - ACTIVATE_W - GAP, height: 26 };
      tBtn.setTitleForState(`${expanded ? 'v ' : '> '}[${i}] ${tool.cls}  槽位 ${tool.slotIndex}`, 0);
      tBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
      tBtn.titleLabel.font = UIFont.boldSystemFontOfSize(12);
      tBtn.contentHorizontalAlignment = alignLeft;
      tBtn.contentEdgeInsets = { top: 0, left: 6, bottom: 0, right: 0 };
      tBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
      tBtn.layer.cornerRadius = 5;
      tBtn.layer.masksToBounds = true;
      tBtn.tag = i;
      tBtn.addTargetActionForControlEvents(addon, 'onDebugToggle:', 1 << 6);
      scroll.addSubview(tBtn);

      const actBtn = UIButton.buttonWithType(0);
      actBtn.frame = { x: panelWidth - PAD - ACTIVATE_W, y, width: ACTIVATE_W, height: 26 };
      actBtn.setTitleForState('激活', 0);
      actBtn.setTitleColorForState(UIColor.whiteColor(), 0);
      actBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.45, 1);
      actBtn.titleLabel.font = UIFont.systemFontOfSize(11);
      actBtn.layer.cornerRadius = 5;
      actBtn.layer.masksToBounds = true;
      actBtn.tag = i;
      actBtn.addTargetActionForControlEvents(addon, 'onActivateTool:', 1 << 6);
      scroll.addSubview(actBtn);

      y += 30;

      if (expanded && tool.view && typeof tool.view === 'object') {
        const keys = Object.keys(tool.view);
        for (let k = 0; k < Math.min(keys.length, 30); k++) {
          addRow(keys[k], tool.view[keys[k]], 1);
        }
        if (keys.length > 30) addRow('...', `(${keys.length} keys total)`, 1);
      }
    }

    scroll.contentSize = { width: panelWidth, height: y + 8 };
  }

  function updateData(nextDebugData) {
    debugData = nextDebugData;
    render();
  }

  function toggleItem(idx) {
    expandedIndices[idx] = !expandedIndices[idx];
    render();
  }

  return {
    view: pane,
    onShow: render,
    updateData,
    toggleItem,
  };
}
