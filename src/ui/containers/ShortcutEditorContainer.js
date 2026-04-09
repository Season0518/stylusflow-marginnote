// 编辑器状态协调：open/dismiss/save/clear，视图构建委托给 EditorModal
function createShortcutEditorContainer(pane, panelWidth, contentHeight, addon, onBindingsUpdated) {
  var FLAGS = ShortcutController.FLAGS;
  var MODE_SHORTCUT = 'shortcut';
  var MODE_PAN_TRIGGER = 'panTrigger';
  var MODE_PAN_STOP = 'panStop';
  var MODE_PAN_EXPIRED = 'panExpired';
  var modifierFlagByTag = {
    3101: FLAGS.COMMAND,
    3102: FLAGS.OPTION,
    3103: FLAGS.CONTROL,
    3104: FLAGS.SHIFT,
  };

  var _overlay = null;
  var _mode = null;
  var _actionId = null;
  var _flags = 0;
  var _inputField = null;
  var _modifierButtons = {};

  function showMessage(title, message) {
    UIAlertView.showWithTitleMessageStyleCancelButtonTitleOtherButtonTitlesTapBlock(
      title, message, 0, Strings.editor.ok, [], function () {}
    );
  }

  function updateModifierButtonStyle(tag) {
    var button = _modifierButtons[tag];
    if (!button) return;
    var selected = !!(_flags & (modifierFlagByTag[tag] || 0));
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

  function dismiss() {
    if (_inputField && _inputField.resignFirstResponder) _inputField.resignFirstResponder();
    _inputField = null;
    _mode = null;
    _actionId = null;
    _flags = 0;
    if (_overlay && _overlay.removeFromSuperview) _overlay.removeFromSuperview();
    _overlay = null;
    for (var key in _modifierButtons) delete _modifierButtons[key];
  }

  function mountBuiltEditor(built) {
    _overlay = built.overlay;
    _inputField = built.inputField;
    _modifierButtons = built.modifierButtons;

    for (var tag in _modifierButtons) {
      _modifierButtons[tag].addTargetActionForControlEvents(addon, 'onShortcutEditorModifierTap:', 1 << 6);
    }
    built.cancelBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorCancel:', 1 << 6);
    built.clearBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorClear:', 1 << 6);
    built.saveBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorSave:', 1 << 6);

    updateAllModifierButtons();
    pane.addSubview(_overlay);
  }

  function _openModal(mode, flags, actionId, modalOpts) {
    dismiss();
    _mode = mode;
    _flags = flags;
    _actionId = actionId;
    modalOpts.panelWidth = panelWidth;
    modalOpts.contentHeight = contentHeight;
    mountBuiltEditor(EditorModal.build(modalOpts));
  }

  function openShortcut(actionId) {
    var cb = ShortcutController.getBinding(actionId);
    _openModal(MODE_SHORTCUT, cb ? cb.flags : FLAGS.COMMAND | FLAGS.SHIFT, actionId, {
      title: Strings.editor.title,
      actionTitle: ShortcutConstants.toolActionTitle(actionId),
      currentLabel: Strings.editor.currentBinding(cb ? cb.display : Strings.editor.notSet),
      showModifiers: true,
      inputLabel: Strings.editor.keyHint,
      inputPlaceholder: Strings.editor.keyPlaceholder,
      inputValue: cb ? ShortcutFormatter.formatInput(cb.input) : '',
      clearTitle: Strings.editor.clear,
    });
  }

  function openPanTrigger() {
    var cb = PanGateController.getTriggerBinding();
    _openModal(MODE_PAN_TRIGGER, cb ? cb.flags : 0, null, {
      title: Strings.editor.settingTitle,
      actionTitle: Strings.editor.panTriggerAction,
      currentLabel: Strings.editor.currentBinding(cb ? cb.display : Strings.editor.notSet),
      showModifiers: true,
      inputLabel: Strings.editor.keyHint,
      inputPlaceholder: Strings.editor.keyPlaceholder,
      inputValue: cb ? ShortcutFormatter.formatInput(cb.input) : '',
      clearTitle: Strings.editor.resetDefault,
    });
  }

  function openPanStop() {
    var cb = PanGateController.getStopBinding();
    _openModal(MODE_PAN_STOP, cb ? cb.flags : FLAGS.OPTION, null, {
      title: Strings.editor.settingTitle,
      actionTitle: Strings.editor.panStopAction,
      currentLabel: Strings.editor.currentBinding(cb ? cb.display : Strings.editor.notSet),
      showModifiers: true,
      inputLabel: Strings.editor.optionalKeyHint,
      inputPlaceholder: Strings.editor.keyPlaceholder,
      inputValue: cb && cb.input ? ShortcutFormatter.formatInput(cb.input) : '',
      clearTitle: Strings.editor.clear,
    });
  }

  function openPanExpired() {
    var v = PanGateController.getExpiredMs();
    _openModal(MODE_PAN_EXPIRED, 0, null, {
      title: Strings.editor.settingTitle,
      actionTitle: Strings.editor.panExpiredAction,
      currentLabel: Strings.editor.currentValue(String(v) + 'ms'),
      showModifiers: false,
      inputLabel: Strings.editor.delayHint,
      inputPlaceholder: Strings.editor.delayPlaceholder,
      inputValue: String(v),
      clearTitle: Strings.editor.resetDefault,
    });
  }

  function handleModifierTap(tag) {
    var flag = modifierFlagByTag[tag];
    if (!flag || !_mode || _mode === MODE_PAN_EXPIRED) return false;
    if (_flags & flag) _flags &= ~flag;
    else _flags |= flag;
    updateModifierButtonStyle(tag);
    return true;
  }

  function handleCancel() { dismiss(); return true; }

  function handleClear() {
    if (_mode === MODE_SHORTCUT) {
      if (!_actionId) return false;
      ShortcutController.clearBindingWithRecord(_actionId);
    } else if (_mode === MODE_PAN_TRIGGER) {
      PanGateController.resetTriggerBinding();
    } else if (_mode === MODE_PAN_STOP) {
      PanGateController.clearStop();
    } else if (_mode === MODE_PAN_EXPIRED) {
      PanGateController.resetExpiredMs();
    } else {
      return false;
    }
    onBindingsUpdated();
    dismiss();
    return true;
  }

  function handleSave() {
    var input = _inputField ? _inputField.text : '';
    var result = null;
    if (_mode === MODE_SHORTCUT) {
      if (!_actionId) return false;
      result = ShortcutController.applyCustomBinding(_actionId, input, _flags);
    } else if (_mode === MODE_PAN_TRIGGER) {
      result = PanGateController.applyTriggerBinding(input, _flags);
    } else if (_mode === MODE_PAN_STOP) {
      result = PanGateController.applyStopBinding(input, _flags);
    } else if (_mode === MODE_PAN_EXPIRED) {
      result = PanGateController.setExpiredMs(input);
    } else {
      return false;
    }

    if (!result || !result.ok) {
      showMessage(Strings.editor.saveFailed, (result && result.reason) || Strings.editor.invalidFormat);
      return false;
    }
    onBindingsUpdated();
    dismiss();
    return true;
  }

  return {
    open: openShortcut,
    openPanTrigger: openPanTrigger,
    openPanStop: openPanStop,
    openPanExpired: openPanExpired,
    dismiss: dismiss,
    handleModifierTap: handleModifierTap,
    handleCancel: handleCancel,
    handleClear: handleClear,
    handleSave: handleSave,
  };
}
