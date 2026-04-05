function createShortcutsPane(config) {
  const panelWidth = config.panelWidth;
  const originY = config.originY;
  const contentHeight = config.contentHeight;
  const addon = config.addon;
  const ACTIONS = ShortcutController.ACTIONS;
  const FLAGS = ShortcutController.FLAGS;

  const pane = new UIView({ x: 0, y: originY, width: panelWidth, height: contentHeight });
  pane.backgroundColor = UIColor.colorWithWhiteAlpha(0.98, 1);

  const scroll = new UIScrollView({ x: 0, y: 0, width: panelWidth, height: contentHeight });
  scroll.alwaysBounceVertical = true;
  pane.addSubview(scroll);

  const cycleShortcutItems = [
    { actionId: ACTIONS.PREV_TOOL, title: '切换上一个工具' },
    { actionId: ACTIONS.NEXT_TOOL, title: '切换下一个工具' },
  ];

  function targetToolItems() {
    const ids = ShortcutController.getToolActionIds();
    return ids.map(actionId => ({ actionId, title: ShortcutConstants.toolActionTitle(actionId) }));
  }

  let targetToolsExpanded = false;
  let bindingLabelMap = ShortcutController.getBindingLabelMap();
  const actionIdByTag = {};
  let nextActionTag = 100;
  const modifierFlagByTag = {
    3101: FLAGS.COMMAND,
    3102: FLAGS.OPTION,
    3103: FLAGS.CONTROL,
    3104: FLAGS.SHIFT,
  };
  let editorOverlay = null;
  let editorActionId = null;
  let editorFlags = 0;
  let editorKeyField = null;
  const modifierButtons = {};

  function showMessage(title, message) {
    UIAlertView.showWithTitleMessageStyleCancelButtonTitleOtherButtonTitlesTapBlock(
      title,
      message,
      0,
      '知道了',
      [],
      function () {},
    );
  }

  function clearSubviews(scrollView) {
    const subs = scrollView.subviews;
    if (!subs) return;
    for (let i = 0; i < subs.length; i++) subs[i].removeFromSuperview();
  }

  function addHint(text, y, height) {
    const hint = new UILabel({ x: 12, y, width: panelWidth - 24, height });
    hint.text = text;
    hint.font = UIFont.systemFontOfSize(11);
    hint.textColor = UIColor.lightGrayColor();
    scroll.addSubview(hint);
  }

  function addKeyBadge(row, keyText, x, y, width, height) {
    const keyBadge = new UIView({ x, y, width, height });
    keyBadge.backgroundColor = UIColor.colorWithWhiteAlpha(0.88, 1);
    keyBadge.layer.cornerRadius = 6;
    keyBadge.layer.masksToBounds = true;
    keyBadge.layer.borderWidth = 0.5;
    keyBadge.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.45);

    const keyLbl = new UILabel({ x: 0, y: 0, width, height });
    keyLbl.text = keyText;
    keyLbl.textAlignment = 1;
    keyLbl.font = UIFont.systemFontOfSize(11);
    keyLbl.textColor = UIColor.darkGrayColor();
    keyBadge.addSubview(keyLbl);
    row.addSubview(keyBadge);
    return keyBadge;
  }

  function getBindingLabel(actionId) {
    return bindingLabelMap[actionId] || '未设置';
  }

  function addShortcutRows(items, startY, options) {
    const opts = options || {};
    const PAD = 10;
    const ROW_H = opts.compact ? 42 : 46;
    const KEY_W = 86;
    const LEFT_PAD = opts.indent || 12;
    const TITLE_W = panelWidth - PAD * 2 - KEY_W - (opts.compact ? 40 : 26);
    let y = startY;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const row = new UIView({ x: PAD, y, width: panelWidth - PAD * 2, height: ROW_H });
      row.backgroundColor = opts.compact
        ? UIColor.colorWithWhiteAlpha(0.965, 1)
        : UIColor.colorWithWhiteAlpha(0.95, 1);
      row.layer.cornerRadius = 7;
      row.layer.masksToBounds = true;
      row.layer.borderWidth = 0.5;
      row.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.35);

      const titleLbl = new UILabel({ x: LEFT_PAD, y: 0, width: TITLE_W, height: ROW_H });
      titleLbl.text = item.title;
      titleLbl.font = opts.compact ? UIFont.systemFontOfSize(12) : UIFont.boldSystemFontOfSize(12);
      titleLbl.textColor = UIColor.darkGrayColor();
      row.addSubview(titleLbl);

      const badgeH = opts.compact ? 24 : 28;
      const badgeY = (ROW_H - badgeH) / 2;
      const badgeX = panelWidth - PAD * 2 - KEY_W - 8;
      const keyBadge = addKeyBadge(row, getBindingLabel(item.actionId), badgeX, badgeY, KEY_W, badgeH);

      const tapBtn = UIButton.buttonWithType(0);
      tapBtn.frame = { x: badgeX, y: badgeY, width: KEY_W, height: badgeH };
      tapBtn.tag = nextActionTag;
      actionIdByTag[nextActionTag] = item.actionId;
      nextActionTag += 1;
      tapBtn.addTargetActionForControlEvents(addon, 'onShortcutBindingTap:', 1 << 6);
      row.addSubview(tapBtn);

      const tipLbl = new UILabel({ x: LEFT_PAD, y: ROW_H - 14, width: TITLE_W, height: 12 });
      tipLbl.text = '点键位自定义';
      tipLbl.font = UIFont.systemFontOfSize(9);
      tipLbl.textColor = UIColor.lightGrayColor();
      row.addSubview(tipLbl);

      scroll.addSubview(row);
      y += ROW_H + (opts.compact ? 4 : 6);
    }

    scroll.contentSize = { width: panelWidth, height: y + 6 };
    return y;
  }

  function addTargetToolsTab(y) {
    const PAD = 10;
    const ROW_H = 42;

    const row = new UIView({ x: PAD, y, width: panelWidth - PAD * 2, height: ROW_H });
    row.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    row.layer.cornerRadius = 7;
    row.layer.masksToBounds = true;
    row.layer.borderWidth = 0.5;
    row.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.4);

    const titleLbl = new UILabel({ x: 12, y: 0, width: panelWidth - PAD * 2 - 40, height: ROW_H });
    titleLbl.text = '指定工具切换';
    titleLbl.font = UIFont.boldSystemFontOfSize(12);
    titleLbl.textColor = UIColor.darkGrayColor();
    row.addSubview(titleLbl);

    const indicatorLbl = new UILabel({ x: panelWidth - PAD * 2 - 24, y: 0, width: 16, height: ROW_H });
    indicatorLbl.text = targetToolsExpanded ? 'v' : '>';
    indicatorLbl.textAlignment = 1;
    indicatorLbl.font = UIFont.boldSystemFontOfSize(12);
    indicatorLbl.textColor = UIColor.grayColor();
    row.addSubview(indicatorLbl);

    const hitBtn = UIButton.buttonWithType(0);
    hitBtn.frame = { x: 0, y: 0, width: panelWidth - PAD * 2, height: ROW_H };
    hitBtn.addTargetActionForControlEvents(addon, 'onToggleDirectToolsTab:', 1 << 6);
    row.addSubview(hitBtn);

    scroll.addSubview(row);
    return y + ROW_H + 4;
  }

  function render() {
    clearSubviews(scroll);
    for (const tag in actionIdByTag) delete actionIdByTag[tag];
    nextActionTag = 100;
    addHint('点击键位可自定义修饰键与按键', 8, 20);

    let y = 32;
    y = addTargetToolsTab(y);

    if (targetToolsExpanded) {
      y = addShortcutRows(targetToolItems(), y, { compact: true, indent: 20 });
      y += 4;
    }

    addShortcutRows(cycleShortcutItems, y, { compact: false, indent: 12 });
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

  function toggleDirectToolsTab() {
    targetToolsExpanded = !targetToolsExpanded;
    renderWithLightTransition();
  }

  function updateModifierButtonStyle(tag) {
    const button = modifierButtons[tag];
    if (!button) return;
    const flag = modifierFlagByTag[tag] || 0;
    const selected = !!(editorFlags & flag);
    button.backgroundColor = selected
      ? UIColor.colorWithWhiteAlpha(0.24, 1)
      : UIColor.colorWithWhiteAlpha(0.93, 1);
    button.setTitleColorForState(selected ? UIColor.whiteColor() : UIColor.darkGrayColor(), 0);
  }

  function updateAllModifierButtons() {
    updateModifierButtonStyle(3101);
    updateModifierButtonStyle(3102);
    updateModifierButtonStyle(3103);
    updateModifierButtonStyle(3104);
  }

  function dismissBindingEditor() {
    if (editorKeyField && editorKeyField.resignFirstResponder) editorKeyField.resignFirstResponder();
    editorKeyField = null;
    editorActionId = null;
    editorFlags = 0;
    if (editorOverlay && editorOverlay.removeFromSuperview) editorOverlay.removeFromSuperview();
    editorOverlay = null;
    for (const key in modifierButtons) delete modifierButtons[key];
  }

  function presentBindingEditor(actionId) {
    const actionTitle = ShortcutConstants.toolActionTitle(actionId);
    const currentBinding = ShortcutController.getBinding(actionId);

    dismissBindingEditor();
    editorActionId = actionId;
    editorFlags = currentBinding ? currentBinding.flags : FLAGS.COMMAND | FLAGS.SHIFT;

    editorOverlay = new UIView({ x: 0, y: 0, width: panelWidth, height: contentHeight });
    editorOverlay.backgroundColor = UIColor.colorWithWhiteAlpha(0.1, 0.45);

    const modalW = panelWidth - 28;
    const modalH = 248;
    const modalX = 14;
    const modalY = Math.max(16, (contentHeight - modalH) / 2);
    const modal = new UIView({ x: modalX, y: modalY, width: modalW, height: modalH });
    modal.backgroundColor = UIColor.colorWithWhiteAlpha(0.985, 1);
    modal.layer.cornerRadius = 10;
    modal.layer.masksToBounds = true;
    modal.layer.borderWidth = 0.5;
    modal.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.35);

    const title = new UILabel({ x: 12, y: 10, width: modalW - 24, height: 20 });
    title.text = '自定义快捷键';
    title.font = UIFont.boldSystemFontOfSize(13);
    title.textAlignment = 1;
    title.textColor = UIColor.darkGrayColor();
    modal.addSubview(title);

    const actionLbl = new UILabel({ x: 12, y: 32, width: modalW - 24, height: 16 });
    actionLbl.text = actionTitle;
    actionLbl.textAlignment = 1;
    actionLbl.font = UIFont.systemFontOfSize(12);
    actionLbl.textColor = UIColor.grayColor();
    modal.addSubview(actionLbl);

    const currentLbl = new UILabel({ x: 12, y: 50, width: modalW - 24, height: 14 });
    currentLbl.text = `当前：${currentBinding ? currentBinding.display : '未设置'}`;
    currentLbl.textAlignment = 1;
    currentLbl.font = UIFont.systemFontOfSize(10);
    currentLbl.textColor = UIColor.lightGrayColor();
    modal.addSubview(currentLbl);

    const modTitle = new UILabel({ x: 12, y: 70, width: modalW - 24, height: 14 });
    modTitle.text = '修饰键';
    modTitle.font = UIFont.boldSystemFontOfSize(11);
    modTitle.textColor = UIColor.darkGrayColor();
    modal.addSubview(modTitle);

    function addModButton(tag, text, x, y) {
      const btn = UIButton.buttonWithType(0);
      btn.frame = { x, y, width: (modalW - 36) / 2, height: 28 };
      btn.tag = tag;
      btn.setTitleForState(text, 0);
      btn.titleLabel.font = UIFont.systemFontOfSize(11);
      btn.layer.cornerRadius = 6;
      btn.layer.masksToBounds = true;
      btn.layer.borderWidth = 0.5;
      btn.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.45);
      btn.addTargetActionForControlEvents(addon, 'onShortcutEditorModifierTap:', 1 << 6);
      modifierButtons[tag] = btn;
      modal.addSubview(btn);
    }

    addModButton(3101, 'Command', 12, 88);
    addModButton(3102, 'Option', 20 + (modalW - 36) / 2, 88);
    addModButton(3103, 'Control', 12, 120);
    addModButton(3104, 'Shift', 20 + (modalW - 36) / 2, 120);
    updateAllModifierButtons();

    const keyTitle = new UILabel({ x: 12, y: 154, width: modalW - 24, height: 14 });
    keyTitle.text = '按键（单字符，或 Up/Down/Left/Right/Esc）';
    keyTitle.font = UIFont.boldSystemFontOfSize(11);
    keyTitle.textColor = UIColor.darkGrayColor();
    modal.addSubview(keyTitle);

    editorKeyField = new UITextField({ x: 12, y: 172, width: modalW - 24, height: 28 });
    editorKeyField.borderStyle = 2;
    editorKeyField.placeholder = '例如：l、1、[';
    editorKeyField.text = currentBinding ? ShortcutFormatter.formatInput(currentBinding.input) : '';
    modal.addSubview(editorKeyField);

    const cancelBtn = UIButton.buttonWithType(0);
    cancelBtn.frame = { x: 12, y: 208, width: 64, height: 28 };
    cancelBtn.setTitleForState('取消', 0);
    cancelBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
    cancelBtn.titleLabel.font = UIFont.systemFontOfSize(11);
    cancelBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    cancelBtn.layer.cornerRadius = 6;
    cancelBtn.layer.masksToBounds = true;
    cancelBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorCancel:', 1 << 6);
    modal.addSubview(cancelBtn);

    const clearBtn = UIButton.buttonWithType(0);
    clearBtn.frame = { x: modalW - 148, y: 208, width: 64, height: 28 };
    clearBtn.setTitleForState('清除', 0);
    clearBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
    clearBtn.titleLabel.font = UIFont.systemFontOfSize(11);
    clearBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    clearBtn.layer.cornerRadius = 6;
    clearBtn.layer.masksToBounds = true;
    clearBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorClear:', 1 << 6);
    modal.addSubview(clearBtn);

    const saveBtn = UIButton.buttonWithType(0);
    saveBtn.frame = { x: modalW - 76, y: 208, width: 64, height: 28 };
    saveBtn.setTitleForState('保存', 0);
    saveBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    saveBtn.titleLabel.font = UIFont.boldSystemFontOfSize(11);
    saveBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.3, 1);
    saveBtn.layer.cornerRadius = 6;
    saveBtn.layer.masksToBounds = true;
    saveBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorSave:', 1 << 6);
    modal.addSubview(saveBtn);

    editorOverlay.addSubview(modal);
    pane.addSubview(editorOverlay);
  }

  function updateBindings(nextBindingMap) {
    bindingLabelMap = nextBindingMap || {};
    render();
  }

  function handleBindingTap(tag) {
    const actionId = actionIdByTag[tag];
    if (!actionId) return false;
    presentBindingEditor(actionId);
    return true;
  }

  function handleEditorModifierTap(tag) {
    const flag = modifierFlagByTag[tag];
    if (!flag || !editorActionId) return false;
    if (editorFlags & flag) editorFlags &= ~flag;
    else editorFlags |= flag;
    updateModifierButtonStyle(tag);
    return true;
  }

  function handleEditorCancel() {
    dismissBindingEditor();
    return true;
  }

  function handleEditorClear() {
    if (!editorActionId) return false;
    ShortcutController.clearBindingWithRecord(editorActionId);
    bindingLabelMap = ShortcutController.getBindingLabelMap();
    renderWithLightTransition();
    dismissBindingEditor();
    return true;
  }

  function handleEditorSave() {
    if (!editorActionId) return false;
    const input = editorKeyField ? editorKeyField.text : '';
    const result = ShortcutController.applyCustomBinding(editorActionId, input, editorFlags);
    if (!result || !result.ok) {
      showMessage('保存失败', (result && result.reason) || '快捷键格式不正确');
      return false;
    }
    bindingLabelMap = ShortcutController.getBindingLabelMap();
    renderWithLightTransition();
    dismissBindingEditor();
    return true;
  }

  render();

  return {
    view: pane,
    onShow: render,
    toggleDirectToolsTab,
    updateBindings,
    handleBindingTap,
    handleEditorModifierTap,
    handleEditorCancel,
    handleEditorClear,
    handleEditorSave,
  };
}
