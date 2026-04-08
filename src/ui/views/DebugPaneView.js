// Debug tab 容器骨架：pane + 扫描/重置按钮 + 事件拦截按钮 + scroll（纯视图，不挂事件）
// DebugPaneView.build(config) → { pane, scroll, scanBtn, resetBtn, panUpBtn, ..., interceptBtn }
// config: { panelWidth, originY, contentHeight }
const DebugPaneView = (function () {
  function styleButton(button, title, bgColor) {
    button.setTitleForState(title, 0);
    button.setTitleColorForState(UIColor.whiteColor(), 0);
    button.backgroundColor = bgColor;
    button.titleLabel.font = UIFont.systemFontOfSize(13);
    button.layer.cornerRadius = 7;
    button.layer.masksToBounds = true;
  }

  function build(config) {
    var panelWidth = config.panelWidth;
    var contentHeight = config.contentHeight;

    var pane = new UIView({ x: 0, y: config.originY, width: panelWidth, height: contentHeight });
    pane.backgroundColor = UIColor.whiteColor();
    pane.hidden = true;

    var btnW = (panelWidth - 28) / 2;

    var scanBtn = UIButton.buttonWithType(0);
    scanBtn.frame = { x: 10, y: 10, width: btnW, height: 36 };
    styleButton(scanBtn, Strings.debug.scanTools, UIColor.colorWithWhiteAlpha(0.35, 1));
    pane.addSubview(scanBtn);

    var resetBtn = UIButton.buttonWithType(0);
    resetBtn.frame = { x: 18 + btnW, y: 10, width: btnW, height: 36 };
    styleButton(resetBtn, Strings.debug.resetConfig, UIColor.colorWithWhiteAlpha(0.58, 1));
    pane.addSubview(resetBtn);

    var panBtnW = 56;
    var panBtnH = 32;
    var centerX = (panelWidth - panBtnW) / 2;
    var padX = 16;
    var panTop = 58;

    var panUpBtn = UIButton.buttonWithType(0);
    panUpBtn.frame = { x: centerX, y: panTop, width: panBtnW, height: panBtnH };
    styleButton(panUpBtn, Strings.debug.panUp, UIColor.colorWithWhiteAlpha(0.42, 1));
    pane.addSubview(panUpBtn);

    var panLeftBtn = UIButton.buttonWithType(0);
    panLeftBtn.frame = { x: centerX - panBtnW - padX, y: panTop + 36, width: panBtnW, height: panBtnH };
    styleButton(panLeftBtn, Strings.debug.panLeft, UIColor.colorWithWhiteAlpha(0.42, 1));
    pane.addSubview(panLeftBtn);

    var panRightBtn = UIButton.buttonWithType(0);
    panRightBtn.frame = { x: centerX + panBtnW + padX, y: panTop + 36, width: panBtnW, height: panBtnH };
    styleButton(panRightBtn, Strings.debug.panRight, UIColor.colorWithWhiteAlpha(0.42, 1));
    pane.addSubview(panRightBtn);

    var panDownBtn = UIButton.buttonWithType(0);
    panDownBtn.frame = { x: centerX, y: panTop + 72, width: panBtnW, height: panBtnH };
    styleButton(panDownBtn, Strings.debug.panDown, UIColor.colorWithWhiteAlpha(0.42, 1));
    pane.addSubview(panDownBtn);

    var interceptBtn = UIButton.buttonWithType(0);
    interceptBtn.frame = { x: 10, y: panTop + 112, width: panelWidth - 20, height: 32 };
    styleButton(interceptBtn, Strings.debug.interceptStart, UIColor.colorWithRedGreenBlueAlpha(0.2, 0.6, 0.9, 1));
    pane.addSubview(interceptBtn);

    var scrollTop = panTop + 152;
    var scroll = new UIScrollView({ x: 0, y: scrollTop, width: panelWidth, height: contentHeight - scrollTop });
    scroll.alwaysBounceVertical = true;
    pane.addSubview(scroll);

    return {
      pane: pane,
      scroll: scroll,
      scanBtn: scanBtn,
      resetBtn: resetBtn,
      panUpBtn: panUpBtn,
      panDownBtn: panDownBtn,
      panLeftBtn: panLeftBtn,
      panRightBtn: panRightBtn,
      interceptBtn: interceptBtn,
    };
  }

  return { build: build };
})();
