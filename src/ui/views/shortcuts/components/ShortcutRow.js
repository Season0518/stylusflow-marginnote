// 负责构建快捷键列表行的 UI 结构，无业务逻辑
const ShortcutRow = (function () {
  var KEY_W = 86;
  var PAD = 10;

  function addKeyBadge(parent, keyText, x, y, width, height) {
    var badge = new UIView({ x: x, y: y, width: width, height: height });
    badge.backgroundColor = UIColor.colorWithWhiteAlpha(0.88, 1);
    badge.layer.cornerRadius = 6;
    badge.layer.masksToBounds = true;
    badge.layer.borderWidth = 0.5;
    badge.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.45);
    var lbl = new UILabel({ x: 0, y: 0, width: width, height: height });
    lbl.text = keyText;
    lbl.textAlignment = 1;
    lbl.font = UIFont.systemFontOfSize(11);
    lbl.textColor = UIColor.darkGrayColor();
    badge.addSubview(lbl);
    parent.addSubview(badge);
    return badge;
  }

  // 构建一批快捷键行，返回 { y: 下一个起始Y, nextTag: 下一个可用tag }
  function buildRows(scroll, panelWidth, items, opts, getLabel, addon, actionIdByTag, startTag, startY) {
    var compact = opts && opts.compact;
    var ROW_H = compact ? 42 : 46;
    var LEFT_PAD = (opts && opts.indent) || 12;
    var TITLE_W = panelWidth - PAD * 2 - KEY_W - (compact ? 40 : 26);
    var y = startY;
    var tag = startTag;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var row = new UIView({ x: PAD, y: y, width: panelWidth - PAD * 2, height: ROW_H });
      row.backgroundColor = compact
        ? UIColor.colorWithWhiteAlpha(0.965, 1)
        : UIColor.colorWithWhiteAlpha(0.95, 1);
      row.layer.cornerRadius = 7;
      row.layer.masksToBounds = true;
      row.layer.borderWidth = 0.5;
      row.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.35);

      var titleLbl = new UILabel({ x: LEFT_PAD, y: 0, width: TITLE_W, height: ROW_H });
      titleLbl.text = item.title;
      titleLbl.font = compact ? UIFont.systemFontOfSize(12) : UIFont.boldSystemFontOfSize(12);
      titleLbl.textColor = UIColor.darkGrayColor();
      row.addSubview(titleLbl);

      var badgeH = compact ? 24 : 28;
      var badgeY = (ROW_H - badgeH) / 2;
      var badgeX = panelWidth - PAD * 2 - KEY_W - 8;
      addKeyBadge(row, getLabel(item.actionId), badgeX, badgeY, KEY_W, badgeH);

      var tapBtn = UIButton.buttonWithType(0);
      tapBtn.frame = { x: badgeX, y: badgeY, width: KEY_W, height: badgeH };
      tapBtn.tag = tag;
      actionIdByTag[tag] = item.actionId;
      tag += 1;
      tapBtn.addTargetActionForControlEvents(addon, 'onShortcutBindingTap:', 1 << 6);
      row.addSubview(tapBtn);

      scroll.addSubview(row);
      y += ROW_H + (compact ? 4 : 6);
    }

    return { y: y, nextTag: tag };
  }

  // 构建"指定工具切换"折叠行，返回下一个起始Y
  function buildTargetToolsTabRow(scroll, panelWidth, expanded, addon, startY) {
    var ROW_H = 42;
    var row = new UIView({ x: PAD, y: startY, width: panelWidth - PAD * 2, height: ROW_H });
    row.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    row.layer.cornerRadius = 7;
    row.layer.masksToBounds = true;
    row.layer.borderWidth = 0.5;
    row.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.4);

    var titleLbl = new UILabel({ x: 12, y: 0, width: panelWidth - PAD * 2 - 40, height: ROW_H });
    titleLbl.text = Strings.panel.directToolsSection;
    titleLbl.font = UIFont.boldSystemFontOfSize(12);
    titleLbl.textColor = UIColor.darkGrayColor();
    row.addSubview(titleLbl);

    var indicatorLbl = new UILabel({ x: panelWidth - PAD * 2 - 24, y: 0, width: 16, height: ROW_H });
    indicatorLbl.text = expanded ? 'v' : '>';
    indicatorLbl.textAlignment = 1;
    indicatorLbl.font = UIFont.boldSystemFontOfSize(12);
    indicatorLbl.textColor = UIColor.grayColor();
    row.addSubview(indicatorLbl);

    var hitBtn = UIButton.buttonWithType(0);
    hitBtn.frame = { x: 0, y: 0, width: panelWidth - PAD * 2, height: ROW_H };
    hitBtn.addTargetActionForControlEvents(addon, 'onToggleDirectToolsTab:', 1 << 6);
    row.addSubview(hitBtn);

    scroll.addSubview(row);
    return startY + ROW_H + 4;
  }

  return {
    addKeyBadge: addKeyBadge,
    buildRows: buildRows,
    buildTargetToolsTabRow: buildTargetToolsTabRow,
  };
})();
