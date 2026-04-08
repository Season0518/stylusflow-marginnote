// 分子：可折叠分区标题行
// SectionHeader.make(parent, panelWidth, expanded, startY) → { view, hitBtn, nextY }
const SectionHeader = (function () {
  var PAD = 10;
  var ROW_H = 42;

  function make(parent, panelWidth, expanded, startY) {
    var row = Card.make(
      { x: PAD, y: startY, width: panelWidth - PAD * 2, height: ROW_H },
      { bg: 0.93, radius: 7, border: 0.4 }
    );

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
    row.addSubview(hitBtn);

    if (parent) parent.addSubview(row);
    return { view: row, hitBtn: hitBtn, nextY: startY + ROW_H + 4 };
  }

  return { make: make };
})();
