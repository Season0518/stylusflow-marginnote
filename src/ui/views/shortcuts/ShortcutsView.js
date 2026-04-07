// Shortcuts tab 视图协调器：组合 ShortcutRow + ShortcutEditor
function createShortcutsView(config) {
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

  function render() {
    UIViewTree.clearSubviews(scroll);
    for (var tag in actionIdByTag) delete actionIdByTag[tag];
    nextActionTag = 100;

    var y = 10;
    y = ShortcutRow.buildTargetToolsTabRow(scroll, panelWidth, targetToolsExpanded, addon, y);

    if (targetToolsExpanded) {
      var expandedRes = ShortcutRow.buildRows(
        scroll, panelWidth, targetToolItems(),
        { compact: true, indent: 20 },
        getBindingLabel, addon, actionIdByTag, nextActionTag, y
      );
      y = expandedRes.y + 4;
      nextActionTag = expandedRes.nextTag;
    }

    var cycleRes = ShortcutRow.buildRows(
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

  var editor = createShortcutEditor(
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
    editor.open(actionId);
    return true;
  }

  render();

  return {
    view: pane,
    onShow: render,
    toggleDirectToolsTab: toggleDirectToolsTab,
    updateBindings: updateBindings,
    handleBindingTap: handleBindingTap,
    handleEditorModifierTap: editor.handleModifierTap,
    handleEditorCancel: editor.handleCancel,
    handleEditorClear: editor.handleClear,
    handleEditorSave: editor.handleSave,
  };
}
