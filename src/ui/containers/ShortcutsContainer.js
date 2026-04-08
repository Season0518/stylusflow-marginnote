// Shortcuts tab 状态协调：绑定列表渲染、折叠状态、编辑器委托
function createShortcutsContainer(config) {
  var panelWidth = config.panelWidth;
  var addon = config.addon;
  var ACTIONS = ShortcutController.ACTIONS;

  var built = ShortcutsPaneView.build(config);
  var pane = built.pane;
  var scroll = built.scroll;

  var cycleItems = [
    { actionId: ACTIONS.PREV_TOOL, title: Strings.actions.prevTool },
    { actionId: ACTIONS.NEXT_TOOL, title: Strings.actions.nextTool },
  ];

  var targetToolsExpanded = false;
  var bindingLabelMap = ShortcutController.getBindingLabelMap();
  var actionIdByTag = {};
  var nextTag = 100;

  function getBindingLabel(actionId) {
    return bindingLabelMap[actionId] || Strings.editor.notSet;
  }

  function render() {
    UIViewTree.clearSubviews(scroll);
    for (var t in actionIdByTag) delete actionIdByTag[t];
    nextTag = 100;

    var y = 10;

    // 折叠分区标题
    var header = SectionHeader.make(scroll, panelWidth, targetToolsExpanded, y);
    header.hitBtn.addTargetActionForControlEvents(addon, 'onToggleDirectToolsTab:', 1 << 6);
    y = header.nextY;

    // 指定工具行（展开时）
    if (targetToolsExpanded) {
      var toolItems = ShortcutController.getToolActionIds().map(function (actionId) {
        return { actionId: actionId, title: ShortcutConstants.toolActionTitle(actionId) };
      });
      for (var i = 0; i < toolItems.length; i++) {
        var tr = BindingRow.make(scroll, toolItems[i], { panelWidth: panelWidth, compact: true, indent: 20 }, getBindingLabel, y);
        tr.tapBtn.tag = nextTag;
        tr.tapBtn.addTargetActionForControlEvents(addon, 'onShortcutBindingTap:', 1 << 6);
        actionIdByTag[nextTag] = toolItems[i].actionId;
        nextTag++;
        y = tr.nextY;
      }
      y += 4;
    }

    // 循环切换行
    for (var j = 0; j < cycleItems.length; j++) {
      var cr = BindingRow.make(scroll, cycleItems[j], { panelWidth: panelWidth, compact: false, indent: 12 }, getBindingLabel, y);
      cr.tapBtn.tag = nextTag;
      cr.tapBtn.addTargetActionForControlEvents(addon, 'onShortcutBindingTap:', 1 << 6);
      actionIdByTag[nextTag] = cycleItems[j].actionId;
      nextTag++;
      y = cr.nextY;
    }

    scroll.contentSize = { width: panelWidth, height: y + 6 };
  }

  function renderWithTransition() {
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
    renderWithTransition();
  }

  var editor = createShortcutEditorContainer(pane, panelWidth, config.contentHeight, addon, onBindingsUpdated);

  render();

  return {
    view: pane,
    onShow: render,
    updateBindings: function (nextMap) { bindingLabelMap = nextMap || {}; render(); },
    toggleDirectToolsTab: function () { targetToolsExpanded = !targetToolsExpanded; renderWithTransition(); },
    handleBindingTap: function (tag) {
      var actionId = actionIdByTag[tag];
      if (!actionId) return false;
      editor.open(actionId);
      return true;
    },
    handleEditorModifierTap: editor.handleModifierTap,
    handleEditorCancel: editor.handleCancel,
    handleEditorClear: editor.handleClear,
    handleEditorSave: editor.handleSave,
  };
}
