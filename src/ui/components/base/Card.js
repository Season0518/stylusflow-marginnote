// 原子：圆角卡片容器
// Card.make(frame, opts) → UIView
// opts: { bg, radius, border } — border: false 禁用边框，数字表示 alpha
const Card = (function () {
  function make(frame, opts) {
    var o = opts || {};
    var view = new UIView(frame);
    view.backgroundColor = UIColor.colorWithWhiteAlpha(o.bg !== undefined ? o.bg : 0.95, 1);
    view.layer.cornerRadius = o.radius !== undefined ? o.radius : 7;
    view.layer.masksToBounds = true;
    if (o.border !== false) {
      view.layer.borderWidth = 0.5;
      view.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(
        o.border !== undefined ? o.border : 0.35
      );
    }
    return view;
  }

  return { make: make };
})();
