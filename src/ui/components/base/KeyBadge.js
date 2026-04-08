// 原子：按键徽章
// KeyBadge.make(parent, text, frame) → UIView
const KeyBadge = (function () {
  function make(parent, text, frame) {
    var badge = new UIView(frame);
    badge.backgroundColor = UIColor.colorWithWhiteAlpha(0.88, 1);
    badge.layer.cornerRadius = 6;
    badge.layer.masksToBounds = true;
    badge.layer.borderWidth = 0.5;
    badge.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.45);

    var lbl = new UILabel({ x: 0, y: 0, width: frame.width, height: frame.height });
    lbl.text = text;
    lbl.textAlignment = 1;
    lbl.font = UIFont.systemFontOfSize(11);
    lbl.textColor = UIColor.darkGrayColor();
    badge.addSubview(lbl);

    if (parent) parent.addSubview(badge);
    return badge;
  }

  return { make: make };
})();
