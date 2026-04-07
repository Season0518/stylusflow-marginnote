// Debug 面板协调器：数据状态管理，视图构建委托给 DebugView
function createDebugPane(config) {
  var panelWidth = config.panelWidth;
  var originY = config.originY;
  var contentHeight = config.contentHeight;
  var alignLeft = config.alignLeft;
  var addon = config.addon;

  var pane = new UIView({ x: 0, y: originY, width: panelWidth, height: contentHeight });
  pane.backgroundColor = UIColor.whiteColor();
  pane.hidden = true;

  DebugView.buildButtons(pane, panelWidth, addon);

  var scroll = new UIScrollView({ x: 0, y: 56, width: panelWidth, height: contentHeight - 56 });
  scroll.alwaysBounceVertical = true;
  pane.addSubview(scroll);

  var expandedIndices = {};
  var debugData = null;

  function render() {
    DebugView.clearSubviews(scroll);

    if (!debugData) {
      var lbl = new UILabel({ x: 0, y: 20, width: panelWidth, height: 30 });
      lbl.text = Strings.debug.noData;
      lbl.textAlignment = 1;
      lbl.textColor = UIColor.lightGrayColor();
      lbl.font = UIFont.systemFontOfSize(13);
      scroll.addSubview(lbl);
      scroll.contentSize = { width: panelWidth, height: 70 };
      return;
    }

    var y = 8;
    y = DebugView.buildInfoRows(scroll, panelWidth, debugData, y);
    var finalY = DebugView.buildToolRows(
      scroll, panelWidth, debugData.tools || [], expandedIndices, addon, alignLeft, y
    );
    scroll.contentSize = { width: panelWidth, height: finalY + 8 };
  }

  function updateData(nextDebugData) {
    debugData = nextDebugData;
    render();
  }

  function toggleItem(idx) {
    expandedIndices[idx] = !expandedIndices[idx];
    render();
  }

  return {
    view: pane,
    onShow: render,
    updateData: updateData,
    toggleItem: toggleItem,
  };
}
