// 分子：Debug 工具行（展开按钮 + 激活按钮，展开时渲染 KVRow 详情）
// ToolRow.make(parent, tool, expanded, alignLeft, panelWidth, startY) → { tBtn, actBtn, nextY }
// tool: { index, slotIndex, cls, view }
const ToolRow = (function () {
  var PAD = 10;
  var ACTIVATE_W = 64;

  function make(parent, tool, expanded, alignLeft, panelWidth, startY) {
    var y = startY;

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
    tBtn.tag = tool.index;
    parent.addSubview(tBtn);

    var actBtn = UIButton.buttonWithType(0);
    actBtn.frame = { x: panelWidth - PAD - ACTIVATE_W, y: y, width: ACTIVATE_W, height: 26 };
    actBtn.setTitleForState(Strings.debug.activate, 0);
    actBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    actBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.45, 1);
    actBtn.titleLabel.font = UIFont.systemFontOfSize(11);
    actBtn.layer.cornerRadius = 5;
    actBtn.layer.masksToBounds = true;
    actBtn.tag = tool.index;
    parent.addSubview(actBtn);
    y += 30;

    if (expanded && tool.view && typeof tool.view === 'object') {
      var keys = Object.keys(tool.view);
      var count = Math.min(keys.length, 30);
      for (var k = 0; k < count; k++) {
        y = KVRow.make(parent, keys[k], tool.view[keys[k]], y, 1, panelWidth);
      }
      if (keys.length > 30) {
        y = KVRow.make(parent, '...', '(' + keys.length + ' keys total)', y, 1, panelWidth);
      }
    }

    return { tBtn: tBtn, actBtn: actBtn, nextY: y };
  }

  return { make: make };
})();
