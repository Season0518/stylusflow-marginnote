// 分子：快捷键绑定行（card + 标题 + 按键徽章 + 透明点击层）
// BindingRow.make(parent, item, opts, getLabel, startY) → { view, tapBtn, nextY }
// opts: { panelWidth, compact, indent }
const BindingRow = (function () {
  var KEY_W = 86;
  var PAD = 10;

  function make(parent, item, opts, getLabel, startY) {
    var compact = !!opts.compact;
    var ROW_H = compact ? 42 : 46;
    var LEFT_PAD = opts.indent || 12;
    var TITLE_W = opts.panelWidth - PAD * 2 - KEY_W - (compact ? 40 : 26);

    var row = Card.make(
      { x: PAD, y: startY, width: opts.panelWidth - PAD * 2, height: ROW_H },
      { bg: compact ? 0.965 : 0.95, radius: 7, border: 0.35 }
    );

    var titleLbl = new UILabel({ x: LEFT_PAD, y: 0, width: TITLE_W, height: ROW_H });
    titleLbl.text = item.title;
    titleLbl.font = compact ? UIFont.systemFontOfSize(12) : UIFont.boldSystemFontOfSize(12);
    titleLbl.textColor = UIColor.darkGrayColor();
    row.addSubview(titleLbl);

    var badgeH = compact ? 24 : 28;
    var badgeY = (ROW_H - badgeH) / 2;
    var badgeX = opts.panelWidth - PAD * 2 - KEY_W - 8;
    KeyBadge.make(row, getLabel(item.actionId), { x: badgeX, y: badgeY, width: KEY_W, height: badgeH });

    var tapBtn = UIButton.buttonWithType(0);
    tapBtn.frame = { x: badgeX, y: badgeY, width: KEY_W, height: badgeH };
    row.addSubview(tapBtn);

    if (parent) parent.addSubview(row);
    return { view: row, tapBtn: tapBtn, nextY: startY + ROW_H + (compact ? 4 : 6) };
  }

  return { make: make };
})();
