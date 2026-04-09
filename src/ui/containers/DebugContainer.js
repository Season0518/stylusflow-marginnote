// Debug tab 状态协调：数据构建、展开状态、滚动内容渲染
function createDebugContainer(config) {
  var panelWidth = config.panelWidth;
  var addon = config.addon;
  var alignLeft = config.alignLeft || 0;

  var built = DebugPaneView.build(config);
  var pane = built.pane;
  var scroll = built.scroll;

  built.scanBtn.addTargetActionForControlEvents(addon, 'onScanTools:', 1 << 6);
  built.resetBtn.addTargetActionForControlEvents(addon, 'onResetAddonConfig:', 1 << 6);
  built.panUpBtn.addTargetActionForControlEvents(addon, 'onTestPanUp:', 1 << 6);
  built.panDownBtn.addTargetActionForControlEvents(addon, 'onTestPanDown:', 1 << 6);
  built.panLeftBtn.addTargetActionForControlEvents(addon, 'onTestPanLeft:', 1 << 6);
  built.panRightBtn.addTargetActionForControlEvents(addon, 'onTestPanRight:', 1 << 6);
  built.interceptBtn.addTargetActionForControlEvents(addon, 'onToggleEventIntercept:', 1 << 6);

  var expandedIndices = {};
  var debugData = null;

  function syncInterceptButton() {
    if (EventInterceptor.isActive()) {
      built.interceptBtn.setTitleForState(Strings.debug.interceptStop, 0);
      built.interceptBtn.backgroundColor = UIColor.colorWithRedGreenBlueAlpha(0.9, 0.3, 0.2, 1);
    } else {
      built.interceptBtn.setTitleForState(Strings.debug.interceptStart, 0);
      built.interceptBtn.backgroundColor = UIColor.colorWithRedGreenBlueAlpha(0.2, 0.6, 0.9, 1);
    }
  }

  function _applyLiveFields(obj) {
    var panGate = PanGateController.getDebugState();
    obj.interceptStatus = EventInterceptor.isActive() ? Strings.debug.enabled : Strings.debug.disabled;
    obj.panGateStatus = panGate.isActive ? Strings.debug.enabled : Strings.debug.disabled;
    obj.panTriggerKey = panGate.triggerLabel;
    obj.panStopKey = panGate.stopLabel;
    obj.panExpiredMs = String(panGate.expiredMs) + 'ms';
  }

  function buildData(tools, picker) {
    var toolList = tools || [];
    var data = {
      isVisible: CanvasToolController.isVisible(picker),
      toolCount: toolList.length,
      shortcuts: ShortcutController.getDebugState(),
      tools: toolList.map(function (tool, index) {
        return {
          index: index,
          slotIndex: tool.slotIndex,
          cls: CanvasToolController.tryGetClassName(tool.view),
          view: NativeSerializer.serialize(tool.view),
        };
      }),
    };
    _applyLiveFields(data);
    return data;
  }

  function render() {
    if (debugData) _applyLiveFields(debugData);
    UIViewTree.clearSubviews(scroll);
    syncInterceptButton();

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
    y = InfoSection.build(scroll, panelWidth, debugData, y);

    var tools = debugData.tools || [];
    for (var i = 0; i < tools.length; i++) {
      var result = ToolRow.make(scroll, tools[i], !!expandedIndices[i], alignLeft, panelWidth, y);
      result.tBtn.addTargetActionForControlEvents(addon, 'onDebugToggle:', 1 << 6);
      result.actBtn.addTargetActionForControlEvents(addon, 'onActivateTool:', 1 << 6);
      y = result.nextY;
    }

    scroll.contentSize = { width: panelWidth, height: y + 8 };
  }

  function toggleIntercept() {
    console.log('[StylusFlow][Debug] toggleIntercept active=' + String(EventInterceptor.isActive()));
    if (EventInterceptor.isActive()) {
      EventInterceptor.stop();
    } else {
      var started = EventInterceptor.start(addon);
      console.log('[StylusFlow][Debug] EventInterceptor.start -> ' + String(started));
    }
    render();
  }

  return {
    view: pane,
    onShow: render,
    refresh: function (tools, picker) { debugData = buildData(tools, picker); render(); },
    toggleItem: function (idx) { expandedIndices[idx] = !expandedIndices[idx]; render(); },
    toggleIntercept: toggleIntercept,
  };
}
