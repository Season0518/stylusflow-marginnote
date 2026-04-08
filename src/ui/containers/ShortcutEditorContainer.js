// 编辑器状态协调：open/dismiss/save/clear，视图构建委托给 EditorModal
function createShortcutEditorContainer(pane, panelWidth, contentHeight, addon, onBindingsUpdated) {
  var FLAGS = ShortcutController.FLAGS;
  var modifierFlagByTag = {
    3101: FLAGS.COMMAND,
    3102: FLAGS.OPTION,
    3103: FLAGS.CONTROL,
    3104: FLAGS.SHIFT,
  };

  var _overlay = null;
  var _actionId = null;
  var _flags = 0;
  var _keyField = null;
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
    if (_keyField && _keyField.resignFirstResponder) _keyField.resignFirstResponder();
    _keyField = null;
    _actionId = null;
    _flags = 0;
    if (_overlay && _overlay.removeFromSuperview) _overlay.removeFromSuperview();
    _overlay = null;
    for (var key in _modifierButtons) delete _modifierButtons[key];
  }

  function open(actionId) {
    var currentBinding = ShortcutController.getBinding(actionId);
    dismiss();
    _actionId = actionId;
    _flags = currentBinding ? currentBinding.flags : FLAGS.COMMAND | FLAGS.SHIFT;

    var built = EditorModal.build({
      panelWidth: panelWidth,
      contentHeight: contentHeight,
      actionTitle: ShortcutConstants.toolActionTitle(actionId),
      currentBinding: currentBinding,
    });

    _overlay = built.overlay;
    _keyField = built.keyField;
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

  function handleModifierTap(tag) {
    var flag = modifierFlagByTag[tag];
    if (!flag || !_actionId) return false;
    if (_flags & flag) _flags &= ~flag;
    else _flags |= flag;
    updateModifierButtonStyle(tag);
    return true;
  }

  function handleCancel() { dismiss(); return true; }

  function handleClear() {
    if (!_actionId) return false;
    ShortcutController.clearBindingWithRecord(_actionId);
    onBindingsUpdated();
    dismiss();
    return true;
  }

  function handleSave() {
    if (!_actionId) return false;
    var input = _keyField ? _keyField.text : '';
    var result = ShortcutController.applyCustomBinding(_actionId, input, _flags);
    if (!result || !result.ok) {
      showMessage(Strings.editor.saveFailed, (result && result.reason) || Strings.editor.invalidFormat);
      return false;
    }
    onBindingsUpdated();
    dismiss();
    return true;
  }

  return { open: open, dismiss: dismiss, handleModifierTap: handleModifierTap, handleCancel: handleCancel, handleClear: handleClear, handleSave: handleSave };
}
