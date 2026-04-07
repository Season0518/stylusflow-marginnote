// 编辑器组件协调器：状态管理和事件处理，视图构建委托给 ShortcutEditorView
// 使用工厂函数创建，由 ShortcutsView 持有实例
function createShortcutEditor(pane, panelWidth, contentHeight, addon, onBindingsUpdated) {
  var FLAGS = ShortcutController.FLAGS;
  var modifierFlagByTag = {
    3101: FLAGS.COMMAND,
    3102: FLAGS.OPTION,
    3103: FLAGS.CONTROL,
    3104: FLAGS.SHIFT,
  };

  var _editorOverlay = null;
  var _editorActionId = null;
  var _editorFlags = 0;
  var _editorKeyField = null;
  var _modifierButtons = {};

  function showMessage(title, message) {
    UIAlertView.showWithTitleMessageStyleCancelButtonTitleOtherButtonTitlesTapBlock(
      title, message, 0, Strings.editor.ok, [], function () {}
    );
  }

  function updateModifierButtonStyle(tag) {
    var button = _modifierButtons[tag];
    if (!button) return;
    var flag = modifierFlagByTag[tag] || 0;
    var selected = !!(_editorFlags & flag);
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
    if (_editorKeyField && _editorKeyField.resignFirstResponder) {
      _editorKeyField.resignFirstResponder();
    }
    _editorKeyField = null;
    _editorActionId = null;
    _editorFlags = 0;
    if (_editorOverlay && _editorOverlay.removeFromSuperview) {
      _editorOverlay.removeFromSuperview();
    }
    _editorOverlay = null;
    for (var key in _modifierButtons) delete _modifierButtons[key];
  }

  function open(actionId) {
    var currentBinding = ShortcutController.getBinding(actionId);
    dismiss();
    _editorActionId = actionId;
    _editorFlags = currentBinding ? currentBinding.flags : FLAGS.COMMAND | FLAGS.SHIFT;

    var built = ShortcutEditorView.build({
      panelWidth: panelWidth,
      contentHeight: contentHeight,
      actionTitle: ShortcutConstants.toolActionTitle(actionId),
      currentBinding: currentBinding,
      initialFlags: _editorFlags,
    });

    _editorOverlay = built.overlay;
    _editorKeyField = built.keyField;
    _modifierButtons = built.modifierButtons;
    for (var tag in _modifierButtons) {
      _modifierButtons[tag].addTargetActionForControlEvents(addon, 'onShortcutEditorModifierTap:', 1 << 6);
    }
    built.cancelBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorCancel:', 1 << 6);
    built.clearBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorClear:', 1 << 6);
    built.saveBtn.addTargetActionForControlEvents(addon, 'onShortcutEditorSave:', 1 << 6);
    updateAllModifierButtons();
    pane.addSubview(_editorOverlay);
  }

  function handleModifierTap(tag) {
    var flag = modifierFlagByTag[tag];
    if (!flag || !_editorActionId) return false;
    if (_editorFlags & flag) _editorFlags &= ~flag;
    else _editorFlags |= flag;
    updateModifierButtonStyle(tag);
    return true;
  }

  function handleCancel() {
    dismiss();
    return true;
  }

  function handleClear() {
    if (!_editorActionId) return false;
    ShortcutController.clearBindingWithRecord(_editorActionId);
    onBindingsUpdated();
    dismiss();
    return true;
  }

  function handleSave() {
    if (!_editorActionId) return false;
    var input = _editorKeyField ? _editorKeyField.text : '';
    var result = ShortcutController.applyCustomBinding(_editorActionId, input, _editorFlags);
    if (!result || !result.ok) {
      showMessage(Strings.editor.saveFailed, (result && result.reason) || Strings.editor.invalidFormat);
      return false;
    }
    onBindingsUpdated();
    dismiss();
    return true;
  }

  return {
    open: open,
    dismiss: dismiss,
    handleModifierTap: handleModifierTap,
    handleCancel: handleCancel,
    handleClear: handleClear,
    handleSave: handleSave,
  };
}
