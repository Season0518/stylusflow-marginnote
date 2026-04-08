// 原子：键值展示行
// KVRow.make(parent, key, value, y, indent, panelWidth) → nextY
const KVRow = (function () {
  var ROW_H = 20;
  var PAD = 10;

  function make(parent, key, value, y, indent, panelWidth) {
    var xOff = PAD + (indent || 0) * 16;

    var kLbl = new UILabel({ x: xOff, y: y, width: 100, height: ROW_H });
    kLbl.text = key;
    kLbl.font = UIFont.boldSystemFontOfSize(11);
    kLbl.textColor = UIColor.darkGrayColor();
    parent.addSubview(kLbl);

    var vStr = (value === null || value === undefined) ? 'null' : String(value);
    if (vStr.length > 36) vStr = vStr.slice(0, 36) + '...';
    var vLbl = new UILabel({ x: xOff + 104, y: y, width: panelWidth - xOff - 104 - PAD, height: ROW_H });
    vLbl.text = vStr;
    vLbl.font = UIFont.systemFontOfSize(11);
    vLbl.textColor = UIColor.lightGrayColor();
    parent.addSubview(vLbl);

    return y + ROW_H + 2;
  }

  return { make: make };
})();
