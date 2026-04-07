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

  var btns = DebugView.buildButtons(pane, panelWidth);
  btns.scanBtn.addTargetActionForControlEvents(addon, 'onScanTools:', 1 << 6);
  btns.resetBtn.addTargetActionForControlEvents(addon, 'onResetAddonConfig:', 1 << 6);

  var scroll = new UIScrollView({ x: 0, y: 56, width: panelWidth, height: contentHeight - 56 });
  scroll.alwaysBounceVertical = true;
  pane.addSubview(scroll);

  var expandedIndices = {};
  var debugData = null;

  function render() {
    UIViewTree.clearSubviews(scroll);

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
    var toolResult = DebugView.buildToolRows(
      scroll, panelWidth, debugData.tools || [], expandedIndices, alignLeft, y
    );
    for (var i = 0; i < toolResult.toolButtons.length; i++) {
      toolResult.toolButtons[i].tBtn.addTargetActionForControlEvents(addon, 'onDebugToggle:', 1 << 6);
      toolResult.toolButtons[i].actBtn.addTargetActionForControlEvents(addon, 'onActivateTool:', 1 << 6);
    }
    scroll.contentSize = { width: panelWidth, height: toolResult.finalY + 8 };
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
