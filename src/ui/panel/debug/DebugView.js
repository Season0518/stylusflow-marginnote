// 负责构建 Debug 面板的纯视图结构，不含业务逻辑
var DebugView = (function () {
  var PAD = 10;
  var ROW_H = 20;

  function clearSubviews(view) {
    var subs = view.subviews;
    if (!subs) return;
    for (var i = 0; i < subs.length; i++) subs[i].removeFromSuperview();
  }

  // 共享 key-value 行构建，返回下一行 y
  function addKVRow(scroll, panelWidth, y, key, value, indent) {
    var xOff = PAD + indent * 16;
    var kLbl = new UILabel({ x: xOff, y: y, width: 100, height: ROW_H });
    kLbl.text = key;
    kLbl.font = UIFont.boldSystemFontOfSize(11);
    kLbl.textColor = UIColor.darkGrayColor();
    scroll.addSubview(kLbl);
    var vStr = (value === null || value === undefined) ? 'null' : String(value);
    if (vStr.length > 36) vStr = vStr.slice(0, 36) + '...';
    var vLbl = new UILabel({ x: xOff + 104, y: y, width: panelWidth - xOff - 104 - PAD, height: ROW_H });
    vLbl.text = vStr;
    vLbl.font = UIFont.systemFontOfSize(11);
    vLbl.textColor = UIColor.lightGrayColor();
    scroll.addSubview(vLbl);
    return y + ROW_H + 2;
  }

  // 构建顶部扫描/重置按钮
  function buildButtons(pane, panelWidth, addon) {
    var btnW = (panelWidth - 28) / 2;

    var scanBtn = UIButton.buttonWithType(0);
    scanBtn.frame = { x: 10, y: 10, width: btnW, height: 36 };
    scanBtn.setTitleForState(Strings.debug.scanTools, 0);
    scanBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    scanBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.35, 1);
    scanBtn.titleLabel.font = UIFont.systemFontOfSize(13);
    scanBtn.layer.cornerRadius = 7;
    scanBtn.layer.masksToBounds = true;
    scanBtn.addTargetActionForControlEvents(addon, 'onScanTools:', 1 << 6);
    pane.addSubview(scanBtn);

    var resetBtn = UIButton.buttonWithType(0);
    resetBtn.frame = { x: 18 + btnW, y: 10, width: btnW, height: 36 };
    resetBtn.setTitleForState(Strings.debug.resetConfig, 0);
    resetBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    resetBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.58, 1);
    resetBtn.titleLabel.font = UIFont.systemFontOfSize(13);
    resetBtn.layer.cornerRadius = 7;
    resetBtn.layer.masksToBounds = true;
    resetBtn.addTargetActionForControlEvents(addon, 'onResetAddonConfig:', 1 << 6);
    pane.addSubview(resetBtn);
  }

  // 渲染快捷键状态信息行，返回最终 y
  function buildInfoRows(scroll, panelWidth, data, startY) {
    var y = startY;
    var F = Strings.debug.fields;
    var sc = data.shortcuts || {};
    y = addKVRow(scroll, panelWidth, y, F.visible, data.isVisible, 0);
    y = addKVRow(scroll, panelWidth, y, F.toolCount, data.toolCount, 0);
    y = addKVRow(scroll, panelWidth, y, F.bindingCount, sc.bindingCount || 0, 0);
    y = addKVRow(scroll, panelWidth, y, F.triggerCount, sc.triggerCount || 0, 0);
    y = addKVRow(scroll, panelWidth, y, F.lastShortcut, sc.lastShortcut || Strings.debug.none, 0);
    y = addKVRow(scroll, panelWidth, y, F.lastAction, sc.lastActionTitle || Strings.debug.none, 0);
    y = addKVRow(scroll, panelWidth, y, F.lastResult, sc.lastResult || Strings.debug.noTrigger, 0);
    y = addKVRow(scroll, panelWidth, y, F.lastAt, sc.lastAt || Strings.debug.none, 0);
    y = addKVRow(scroll, panelWidth, y, F.lastBindingAction, sc.lastBindingAction || Strings.debug.none, 0);
    y = addKVRow(scroll, panelWidth, y, F.lastBindingValue, sc.lastBindingValue || Strings.debug.none, 0);
    y = addKVRow(scroll, panelWidth, y, F.lastBindingAt, sc.lastBindingAt || Strings.debug.none, 0);
    return y;
  }

  // 渲染工具行（含展开详情），返回最终 y（绝对坐标）
  function buildToolRows(scroll, panelWidth, tools, expandedIndices, addon, alignLeft, startY) {
    var ACTIVATE_W = 64;
    var y = startY || 0;

    for (var i = 0; i < tools.length; i++) {
      var tool = tools[i];
      var expanded = !!expandedIndices[i];

      var tBtn = UIButton.buttonWithType(0);
      tBtn.frame = { x: PAD, y: y, width: panelWidth - PAD * 2 - ACTIVATE_W - 6, height: 26 };
      tBtn.setTitleForState((expanded ? 'v ' : '> ') + Strings.debug.slotLabel(tool.cls, tool.slotIndex), 0);
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

      var actBtn = UIButton.buttonWithType(0);
      actBtn.frame = { x: panelWidth - PAD - ACTIVATE_W, y: y, width: ACTIVATE_W, height: 26 };
      actBtn.setTitleForState(Strings.debug.activate, 0);
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
        var keys = Object.keys(tool.view);
        var count = Math.min(keys.length, 30);
        for (var k = 0; k < count; k++) {
          y = addKVRow(scroll, panelWidth, y, keys[k], tool.view[keys[k]], 1);
        }
        if (keys.length > 30) {
          y = addKVRow(scroll, panelWidth, y, '...', '(' + keys.length + ' keys total)', 1);
        }
      }
    }
    return y;
  }

  return {
    clearSubviews: clearSubviews,
    buildButtons: buildButtons,
    buildInfoRows: buildInfoRows,
    buildToolRows: buildToolRows,
  };
})();
