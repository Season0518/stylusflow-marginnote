// Debug tab 容器骨架：pane + 扫描/重置按钮 + scroll（纯视图，不挂事件）
// DebugPaneView.build(config) → { pane, scroll, scanBtn, resetBtn }
// config: { panelWidth, originY, contentHeight }
const DebugPaneView = (function () {
  function build(config) {
    var panelWidth = config.panelWidth;
    var contentHeight = config.contentHeight;

    var pane = new UIView({ x: 0, y: config.originY, width: panelWidth, height: contentHeight });
    pane.backgroundColor = UIColor.whiteColor();
    pane.hidden = true;

    var btnW = (panelWidth - 28) / 2;

    var scanBtn = UIButton.buttonWithType(0);
    scanBtn.frame = { x: 10, y: 10, width: btnW, height: 36 };
    scanBtn.setTitleForState(Strings.debug.scanTools, 0);
    scanBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    scanBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.35, 1);
    scanBtn.titleLabel.font = UIFont.systemFontOfSize(13);
    scanBtn.layer.cornerRadius = 7;
    scanBtn.layer.masksToBounds = true;
    pane.addSubview(scanBtn);

    var resetBtn = UIButton.buttonWithType(0);
    resetBtn.frame = { x: 18 + btnW, y: 10, width: btnW, height: 36 };
    resetBtn.setTitleForState(Strings.debug.resetConfig, 0);
    resetBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    resetBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.58, 1);
    resetBtn.titleLabel.font = UIFont.systemFontOfSize(13);
    resetBtn.layer.cornerRadius = 7;
    resetBtn.layer.masksToBounds = true;
    pane.addSubview(resetBtn);

    var scroll = new UIScrollView({ x: 0, y: 56, width: panelWidth, height: contentHeight - 56 });
    scroll.alwaysBounceVertical = true;
    pane.addSubview(scroll);

    return { pane: pane, scroll: scroll, scanBtn: scanBtn, resetBtn: resetBtn };
  }

  return { build: build };
})();
