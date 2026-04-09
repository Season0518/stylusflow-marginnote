// 分子：设置编辑 Modal UI（overlay + modal card + 输入框 + 可选 modifier 按钮 + 操作按钮）
// EditorModal.build(config) → { overlay, inputField, modifierButtons, cancelBtn, clearBtn, saveBtn }
// config: { panelWidth, contentHeight, title, actionTitle, currentLabel, showModifiers, inputLabel, inputPlaceholder, inputValue, clearTitle }
const EditorModal = (function () {
  function build(config) {
    var panelWidth = config.panelWidth;
    var contentHeight = config.contentHeight;
    var title = config.title || Strings.editor.title;
    var actionTitle = config.actionTitle || '';
    var currentLabel = config.currentLabel || '';
    var showModifiers = config.showModifiers !== false;
    var inputLabel = config.inputLabel || Strings.editor.keyHint;
    var inputPlaceholder = config.inputPlaceholder || Strings.editor.keyPlaceholder;
    var inputValue = config.inputValue || '';
    var clearTitle = config.clearTitle || Strings.editor.clear;

    var overlay = new UIView({ x: 0, y: 0, width: panelWidth, height: contentHeight });
    overlay.backgroundColor = UIColor.colorWithWhiteAlpha(0.1, 0.45);

    var modalW = panelWidth - 28;
    var modalH = showModifiers ? 248 : 188;
    var modalX = 14;
    var modalY = Math.max(16, (contentHeight - modalH) / 2);

    var modal = Card.make(
      { x: modalX, y: modalY, width: modalW, height: modalH },
      { bg: 0.985, radius: 10, border: 0.35 }
    );

    var titleLbl = new UILabel({ x: 12, y: 10, width: modalW - 24, height: 20 });
    titleLbl.text = title;
    titleLbl.font = UIFont.boldSystemFontOfSize(13);
    titleLbl.textAlignment = 1;
    titleLbl.textColor = UIColor.darkGrayColor();
    modal.addSubview(titleLbl);

    var actionLbl = new UILabel({ x: 12, y: 32, width: modalW - 24, height: 16 });
    actionLbl.text = actionTitle;
    actionLbl.textAlignment = 1;
    actionLbl.font = UIFont.systemFontOfSize(12);
    actionLbl.textColor = UIColor.grayColor();
    modal.addSubview(actionLbl);

    var currentLbl = new UILabel({ x: 12, y: 50, width: modalW - 24, height: 14 });
    currentLbl.text = currentLabel;
    currentLbl.textAlignment = 1;
    currentLbl.font = UIFont.systemFontOfSize(10);
    currentLbl.textColor = UIColor.lightGrayColor();
    modal.addSubview(currentLbl);

    var modifierButtons = {};
    var keyTitleY = 70;
    if (showModifiers) {
      var modTitle = new UILabel({ x: 12, y: 70, width: modalW - 24, height: 14 });
      modTitle.text = Strings.editor.modifiers;
      modTitle.font = UIFont.boldSystemFontOfSize(11);
      modTitle.textColor = UIColor.darkGrayColor();
      modal.addSubview(modTitle);

      var btnW = (modalW - 36) / 2;
      var modDefs = [
        { tag: 3101, text: 'Command', x: 12,          y: 88  },
        { tag: 3102, text: 'Option',  x: 20 + btnW,   y: 88  },
        { tag: 3103, text: 'Control', x: 12,          y: 120 },
        { tag: 3104, text: 'Shift',   x: 20 + btnW,   y: 120 },
      ];
      for (var i = 0; i < modDefs.length; i++) {
        var def = modDefs[i];
        var btn = UIButton.buttonWithType(0);
        btn.frame = { x: def.x, y: def.y, width: btnW, height: 28 };
        btn.tag = def.tag;
        btn.setTitleForState(def.text, 0);
        btn.titleLabel.font = UIFont.systemFontOfSize(11);
        btn.layer.cornerRadius = 6;
        btn.layer.masksToBounds = true;
        btn.layer.borderWidth = 0.5;
        btn.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.45);
        modifierButtons[def.tag] = btn;
        modal.addSubview(btn);
      }
      keyTitleY = 154;
    }

    var keyTitle = new UILabel({ x: 12, y: keyTitleY, width: modalW - 24, height: 14 });
    keyTitle.text = inputLabel;
    keyTitle.font = UIFont.boldSystemFontOfSize(11);
    keyTitle.textColor = UIColor.darkGrayColor();
    modal.addSubview(keyTitle);

    var inputField = new UITextField({ x: 12, y: keyTitleY + 18, width: modalW - 24, height: 28 });
    inputField.borderStyle = 2;
    inputField.placeholder = inputPlaceholder;
    inputField.text = inputValue;
    modal.addSubview(inputField);

    var cancelBtn = UIButton.buttonWithType(0);
    cancelBtn.frame = { x: 12, y: modalH - 40, width: 64, height: 28 };
    cancelBtn.setTitleForState(Strings.editor.cancel, 0);
    cancelBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
    cancelBtn.titleLabel.font = UIFont.systemFontOfSize(11);
    cancelBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    cancelBtn.layer.cornerRadius = 6;
    cancelBtn.layer.masksToBounds = true;
    modal.addSubview(cancelBtn);

    var clearBtn = UIButton.buttonWithType(0);
    clearBtn.frame = { x: modalW - 148, y: modalH - 40, width: 64, height: 28 };
    clearBtn.setTitleForState(clearTitle, 0);
    clearBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
    clearBtn.titleLabel.font = UIFont.systemFontOfSize(11);
    clearBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    clearBtn.layer.cornerRadius = 6;
    clearBtn.layer.masksToBounds = true;
    modal.addSubview(clearBtn);

    var saveBtn = UIButton.buttonWithType(0);
    saveBtn.frame = { x: modalW - 76, y: modalH - 40, width: 64, height: 28 };
    saveBtn.setTitleForState(Strings.editor.save, 0);
    saveBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    saveBtn.titleLabel.font = UIFont.boldSystemFontOfSize(11);
    saveBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.3, 1);
    saveBtn.layer.cornerRadius = 6;
    saveBtn.layer.masksToBounds = true;
    modal.addSubview(saveBtn);

    overlay.addSubview(modal);
    return { overlay: overlay, inputField: inputField, modifierButtons: modifierButtons, cancelBtn: cancelBtn, clearBtn: clearBtn, saveBtn: saveBtn };
  }

  return { build: build };
})();
