// 负责构建快捷键编辑 Modal 的纯视图结构，不含业务逻辑
const ShortcutEditorView = (function () {

  // 构建编辑 Modal，返回 { overlay, keyField, modifierButtons, cancelBtn, clearBtn, saveBtn }（不挂事件）
  // config: { panelWidth, contentHeight, actionTitle, currentBinding, initialFlags }
  function build(config) {
    var panelWidth = config.panelWidth;
    var contentHeight = config.contentHeight;
    var actionTitle = config.actionTitle;
    var currentBinding = config.currentBinding;
    var initialFlags = config.initialFlags;

    var overlay = new UIView({ x: 0, y: 0, width: panelWidth, height: contentHeight });
    overlay.backgroundColor = UIColor.colorWithWhiteAlpha(0.1, 0.45);

    var modalW = panelWidth - 28;
    var modalH = 248;
    var modalX = 14;
    var modalY = Math.max(16, (contentHeight - modalH) / 2);
    var modal = new UIView({ x: modalX, y: modalY, width: modalW, height: modalH });
    modal.backgroundColor = UIColor.colorWithWhiteAlpha(0.985, 1);
    modal.layer.cornerRadius = 10;
    modal.layer.masksToBounds = true;
    modal.layer.borderWidth = 0.5;
    modal.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.35);

    var titleLbl = new UILabel({ x: 12, y: 10, width: modalW - 24, height: 20 });
    titleLbl.text = Strings.editor.title;
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

    var currentDisplay = currentBinding ? currentBinding.display : Strings.editor.notSet;
    var currentLbl = new UILabel({ x: 12, y: 50, width: modalW - 24, height: 14 });
    currentLbl.text = Strings.editor.currentBinding(currentDisplay);
    currentLbl.textAlignment = 1;
    currentLbl.font = UIFont.systemFontOfSize(10);
    currentLbl.textColor = UIColor.lightGrayColor();
    modal.addSubview(currentLbl);

    var modTitle = new UILabel({ x: 12, y: 70, width: modalW - 24, height: 14 });
    modTitle.text = Strings.editor.modifiers;
    modTitle.font = UIFont.boldSystemFontOfSize(11);
    modTitle.textColor = UIColor.darkGrayColor();
    modal.addSubview(modTitle);

    var modifierButtons = {};
    var btnW = (modalW - 36) / 2;
    var modDefs = [
      { tag: 3101, text: 'Command', x: 12, y: 88 },
      { tag: 3102, text: 'Option',  x: 20 + btnW, y: 88 },
      { tag: 3103, text: 'Control', x: 12, y: 120 },
      { tag: 3104, text: 'Shift',   x: 20 + btnW, y: 120 },
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

    var keyTitle = new UILabel({ x: 12, y: 154, width: modalW - 24, height: 14 });
    keyTitle.text = Strings.editor.keyHint;
    keyTitle.font = UIFont.boldSystemFontOfSize(11);
    keyTitle.textColor = UIColor.darkGrayColor();
    modal.addSubview(keyTitle);

    var keyField = new UITextField({ x: 12, y: 172, width: modalW - 24, height: 28 });
    keyField.borderStyle = 2;
    keyField.placeholder = Strings.editor.keyPlaceholder;
    keyField.text = currentBinding ? ShortcutFormatter.formatInput(currentBinding.input) : '';
    modal.addSubview(keyField);

    var cancelBtn = UIButton.buttonWithType(0);
    cancelBtn.frame = { x: 12, y: 208, width: 64, height: 28 };
    cancelBtn.setTitleForState(Strings.editor.cancel, 0);
    cancelBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
    cancelBtn.titleLabel.font = UIFont.systemFontOfSize(11);
    cancelBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    cancelBtn.layer.cornerRadius = 6;
    cancelBtn.layer.masksToBounds = true;
    modal.addSubview(cancelBtn);

    var clearBtn = UIButton.buttonWithType(0);
    clearBtn.frame = { x: modalW - 148, y: 208, width: 64, height: 28 };
    clearBtn.setTitleForState(Strings.editor.clear, 0);
    clearBtn.setTitleColorForState(UIColor.darkGrayColor(), 0);
    clearBtn.titleLabel.font = UIFont.systemFontOfSize(11);
    clearBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.93, 1);
    clearBtn.layer.cornerRadius = 6;
    clearBtn.layer.masksToBounds = true;
    modal.addSubview(clearBtn);

    var saveBtn = UIButton.buttonWithType(0);
    saveBtn.frame = { x: modalW - 76, y: 208, width: 64, height: 28 };
    saveBtn.setTitleForState(Strings.editor.save, 0);
    saveBtn.setTitleColorForState(UIColor.whiteColor(), 0);
    saveBtn.titleLabel.font = UIFont.boldSystemFontOfSize(11);
    saveBtn.backgroundColor = UIColor.colorWithWhiteAlpha(0.3, 1);
    saveBtn.layer.cornerRadius = 6;
    saveBtn.layer.masksToBounds = true;
    modal.addSubview(saveBtn);

    overlay.addSubview(modal);
    return {
      overlay: overlay,
      keyField: keyField,
      modifierButtons: modifierButtons,
      cancelBtn: cancelBtn,
      clearBtn: clearBtn,
      saveBtn: saveBtn,
    };
  }

  return { build: build };
})();
