// Shortcuts tab 容器骨架（纯视图，不含状态）
// ShortcutsPaneView.build(config) → { pane, scroll }
// config: { panelWidth, originY, contentHeight }
const ShortcutsPaneView = (function () {
  function build(config) {
    var pane = new UIView({ x: 0, y: config.originY, width: config.panelWidth, height: config.contentHeight });
    pane.backgroundColor = UIColor.colorWithWhiteAlpha(0.98, 1);

    var scroll = new UIScrollView({ x: 0, y: 0, width: config.panelWidth, height: config.contentHeight });
    scroll.alwaysBounceVertical = true;
    pane.addSubview(scroll);

    return { pane: pane, scroll: scroll };
  }

  return { build: build };
})();
