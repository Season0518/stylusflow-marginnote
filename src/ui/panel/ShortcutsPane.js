// 快捷键面板协调器：组合 ShortcutRowBuilder + ShortcutEditorHandler
function createShortcutsPane(config) {
  var panelWidth = config.panelWidth;
  var originY = config.originY;
  var contentHeight = config.contentHeight;
  var addon = config.addon;
  var ACTIONS = ShortcutController.ACTIONS;

  var pane = new UIView({ x: 0, y: originY, width: panelWidth, height: contentHeight });
  pane.backgroundColor = UIColor.colorWithWhiteAlpha(0.98, 1);

  var scroll = new UIScrollView({ x: 0, y: 0, width: panelWidth, height: contentHeight });
  scroll.alwaysBounceVertical = true;
  pane.addSubview(scroll);

  var cycleShortcutItems = [
    { actionId: ACTIONS.PREV_TOOL, title: Strings.actions.prevTool },
    { actionId: ACTIONS.NEXT_TOOL, title: Strings.actions.nextTool },
  ];

  var targetToolsExpanded = false;
  var bindingLabelMap = ShortcutController.getBindingLabelMap();
  var actionIdByTag = {};
  var nextActionTag = 100;

  function getBindingLabel(actionId) {
    return bindingLabelMap[actionId] || Strings.editor.notSet;
  }

  function targetToolItems() {
    return ShortcutController.getToolActionIds().map(function (actionId) {
      return { actionId: actionId, title: ShortcutConstants.toolActionTitle(actionId) };
    });
  }

  function clearSubviews(view) {
    var subs = view.subviews;
    if (!subs) return;
    for (var i = 0; i < subs.length; i++) subs[i].removeFromSuperview();
  }

  function render() {
    clearSubviews(scroll);
    for (var tag in actionIdByTag) delete actionIdByTag[tag];
    nextActionTag = 100;

    var y = 10;
    y = ShortcutRowBuilder.buildTargetToolsTabRow(scroll, panelWidth, targetToolsExpanded, addon, y);

    if (targetToolsExpanded) {
      var expandedRes = ShortcutRowBuilder.buildRows(
        scroll, panelWidth, targetToolItems(),
        { compact: true, indent: 20 },
        getBindingLabel, addon, actionIdByTag, nextActionTag, y
      );
      y = expandedRes.y + 4;
      nextActionTag = expandedRes.nextTag;
    }

    var cycleRes = ShortcutRowBuilder.buildRows(
      scroll, panelWidth, cycleShortcutItems,
      { compact: false, indent: 12 },
      getBindingLabel, addon, actionIdByTag, nextActionTag, y
    );
    nextActionTag = cycleRes.nextTag;
    scroll.contentSize = { width: panelWidth, height: cycleRes.y + 6 };
  }

  function renderWithLightTransition() {
    try {
      CATransaction.begin();
      CATransaction.setAnimationDuration(0.14);
      CATransaction.setDisableActions(false);
      scroll.alpha = 0.9;
      render();
      scroll.alpha = 1;
      CATransaction.commit();
    } catch (e) {
      scroll.alpha = 1;
      render();
    }
  }

  function onBindingsUpdated() {
    bindingLabelMap = ShortcutController.getBindingLabelMap();
    renderWithLightTransition();
  }

  var editorHandler = createShortcutEditorHandler(
    pane, panelWidth, contentHeight, addon, onBindingsUpdated
  );

  function toggleDirectToolsTab() {
    targetToolsExpanded = !targetToolsExpanded;
    renderWithLightTransition();
  }

  function updateBindings(nextBindingMap) {
    bindingLabelMap = nextBindingMap || {};
    render();
  }

  function handleBindingTap(tag) {
    var actionId = actionIdByTag[tag];
    if (!actionId) return false;
    editorHandler.open(actionId);
    return true;
  }

  render();

  return {
    view: pane,
    onShow: render,
    toggleDirectToolsTab: toggleDirectToolsTab,
    updateBindings: updateBindings,
    handleBindingTap: handleBindingTap,
    handleEditorModifierTap: editorHandler.handleModifierTap,
    handleEditorCancel: editorHandler.handleCancel,
    handleEditorClear: editorHandler.handleClear,
    handleEditorSave: editorHandler.handleSave,
  };
}
