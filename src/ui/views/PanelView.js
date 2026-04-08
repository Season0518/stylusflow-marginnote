// 面板外壳：标题栏、关闭按钮、标签栏及布局工具函数（纯视图，不挂事件）
const PanelView = (function () {
  var PANEL_W = 320;
  var PANEL_H = 460;

  function getSafeBounds(rootView, bounds) {
    if (bounds && bounds.width > 0 && bounds.height > 0) return bounds;
    if (rootView.superview && rootView.superview.bounds) return rootView.superview.bounds;
    return { x: 0, y: 0, width: 1024, height: 768 };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampFrame(rootView, frame, bounds) {
    var b = getSafeBounds(rootView, bounds);
    return {
      x: clamp(frame.x, b.x, b.x + b.width - PANEL_W),
      y: clamp(frame.y, b.y, b.y + b.height - PANEL_H),
      width: PANEL_W,
      height: PANEL_H,
    };
  }

  // 返回 { rootView, titleBar, closeBtn, tabBtns, applyTabStyle, TITLE_H, TAB_H }
  function build() {
    var TITLE_H = 42;
    var TAB_H = 36;

    var rootView = Card.make(
      { x: 80, y: 80, width: PANEL_W, height: PANEL_H },
      { bg: 0.98, radius: 10, border: 0.4 }
    );
    rootView.userInteractionEnabled = true;

    var titleBar = new UIView({ x: 0, y: 0, width: PANEL_W, height: TITLE_H });
    titleBar.backgroundColor = UIColor.colorWithWhiteAlpha(0.2, 1);

    var titleLabel = new UILabel({ x: 12, y: 0, width: PANEL_W - 56, height: TITLE_H });
    titleLabel.text = Strings.panel.title;
    titleLabel.font = UIFont.boldSystemFontOfSize(13);
    titleLabel.textColor = UIColor.whiteColor();

    var closeBtn = UIButton.buttonWithType(0);
    closeBtn.frame = { x: PANEL_W - 44, y: 7, width: 36, height: TITLE_H - 14 };
    closeBtn.setTitleForState(Strings.panel.closeBtn, 0);
    closeBtn.setTitleColorForState(UIColor.colorWithWhiteAlpha(0.7, 1), 0);
    closeBtn.titleLabel.font = UIFont.systemFontOfSize(15);

    titleBar.addSubview(titleLabel);
    titleBar.addSubview(closeBtn);

    var tabBar = new UIView({ x: 0, y: TITLE_H, width: PANEL_W, height: TAB_H });
    tabBar.backgroundColor = UIColor.colorWithWhiteAlpha(0.9, 1);

    var tabBtns = [];
    var tabW = PANEL_W / Strings.panel.tabs.length;
    for (var i = 0; i < Strings.panel.tabs.length; i++) {
      var tabBtn = UIButton.buttonWithType(0);
      tabBtn.frame = { x: i * tabW, y: 0, width: tabW, height: TAB_H };
      tabBtn.setTitleForState(Strings.panel.tabs[i], 0);
      tabBtn.titleLabel.font = UIFont.systemFontOfSize(13);
      tabBtn.tag = i;
      tabBar.addSubview(tabBtn);
      tabBtns.push(tabBtn);
    }

    rootView.addSubview(titleBar);
    rootView.addSubview(tabBar);

    function applyTabStyle(activeIdx) {
      for (var j = 0; j < tabBtns.length; j++) {
        var isActive = j === activeIdx;
        tabBtns[j].backgroundColor = isActive
          ? UIColor.colorWithWhiteAlpha(1, 1)
          : UIColor.colorWithWhiteAlpha(0.9, 1);
        tabBtns[j].setTitleColorForState(
          isActive ? UIColor.darkGrayColor() : UIColor.lightGrayColor(), 0
        );
      }
    }

    return { rootView: rootView, titleBar: titleBar, closeBtn: closeBtn, tabBtns: tabBtns, applyTabStyle: applyTabStyle, TITLE_H: TITLE_H, TAB_H: TAB_H };
  }

  return { PANEL_W: PANEL_W, PANEL_H: PANEL_H, build: build, getSafeBounds: getSafeBounds, clamp: clamp, clampFrame: clampFrame };
})();
