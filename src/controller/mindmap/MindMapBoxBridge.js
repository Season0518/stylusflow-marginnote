// 脑图框选桥接：只通过 Debug 面板手动注入/移除框选 UIPanGestureRecognizer
function createMindMapBoxBridge() {
  var _bridge = null;
  var _freeMove = null;

  function _log(message) {
    try { console.log('[StylusFlow MindMapBridge] ' + String(message || '')); } catch (e) {}
  }

  function _className(value) {
    try { return MindMapShared.getDisplayClassName(value); } catch (e) {}
    try { return UIViewTree.getClassName(value); } catch (e2) {}
    return 'Unknown';
  }

  function _gestureCount(view) {
    try { return MindMapShared.toArray(view.gestureRecognizers).length; } catch (e) {}
    return -1;
  }

  function _enabledValue(recognizer) {
    try { return recognizer && recognizer.enabled !== false; } catch (e) {}
    return null;
  }

  function _stateValue(recognizer) {
    try { return Number(recognizer.state); } catch (e) {}
    return -1;
  }

  function _setEnabled(recognizer, enabled) {
    try {
      recognizer.enabled = enabled;
      return true;
    } catch (e) {
      _log('setEnabled failed enabled=' + enabled + ' error=' + String(e));
      return false;
    }
  }

  function _syncBridgeEnabled(reason) {
    if (!_bridge || !_bridge.recognizer) return false;
    var sessionActive = PanGateController.isSessionActive();
    var shouldEnable = !sessionActive;
    var beforeEnabled = _enabledValue(_bridge.recognizer);
    if (beforeEnabled !== shouldEnable) {
      _setEnabled(_bridge.recognizer, shouldEnable);
    }
    var afterEnabled = _enabledValue(_bridge.recognizer);
    _bridge.enabledState = afterEnabled;
    _log(
      'syncPanGate reason=' + String(reason || 'sync') +
      ' sessionActive=' + sessionActive +
      ' bridgeBeforeEnabled=' + beforeEnabled +
      ' bridgeAfterEnabled=' + afterEnabled +
      ' bridgeState=' + _stateValue(_bridge.recognizer)
    );
    return afterEnabled === shouldEnable;
  }

  function _entryLabel(entry) {
    if (!entry) return 'null';
    return [
      'class=' + (entry.className || ''),
      'id=' + (entry.recognizerId || ''),
      'action=' + (entry.actionName || ''),
      'target=' + (entry.targetClassName || ''),
      'owner=' + _className(entry.ownerView),
      'enabled=' + _enabledValue(entry.recognizer),
      'state=' + _stateValue(entry.recognizer),
    ].join(' ');
  }

  function _entriesSummary(entries) {
    var list = entries || [];
    var out = [];
    var max = Math.min(list.length, 8);
    for (var i = 0; i < max; i++) out.push('[' + i + '] ' + _entryLabel(list[i]));
    if (list.length > max) out.push('... +' + (list.length - max));
    return out.join(' | ');
  }

  function _selectionEntry(studyController, preferredRecognizerId, quiet) {
    var collected = MindMapBoxGestureCollector.collectRecognizerEntries(studyController);
    if (!collected || !collected.mindMapView) {
      if (!quiet) _log('selection lookup failed reason=no-mindmap-view');
      return null;
    }
    var entry = MindMapBoxGestureCollector.findSelectionPanEntry(collected, preferredRecognizerId || '2273');
    if (!entry || !entry.recognizer) {
      if (!quiet) _log('selection lookup failed reason=no-selection-pan candidates=' + _entriesSummary(collected.entries));
      return null;
    }
    if (!quiet) {
      _log(
        'selection lookup roots=' + (collected.roots ? collected.roots.length : 0) +
        ' entries=' + (collected.entries ? collected.entries.length : 0) +
        ' source=' + _entryLabel(entry)
      );
    }
    return entry;
  }

  function stop() {
    var hadBridge = !!_bridge;
    var beforeCount = _bridge && _bridge.view ? _gestureCount(_bridge.view) : -1;
    _log(
      'stop begin active=' + hadBridge +
      ' view=' + (_bridge ? _className(_bridge.view) : '') +
      ' gesturesBefore=' + beforeCount +
      ' bridgeEnabled=' + (_bridge ? _enabledValue(_bridge.recognizer) : '')
    );

    if (_bridge && _bridge.view && _bridge.recognizer) {
      try {
        _bridge.view.removeGestureRecognizer(_bridge.recognizer);
      } catch (e) {
        _log('stop remove failed error=' + String(e));
      }
    }

    var afterCount = _bridge && _bridge.view ? _gestureCount(_bridge.view) : -1;
    _log('stop end active=false gesturesAfter=' + afterCount);
    _bridge = null;
  }

  function start(studyController, preferredRecognizerId) {
    _log('start begin preferred=' + String(preferredRecognizerId || '2273') + ' wasActive=' + isActive());
    if (_freeMove) restoreBoxSelect(studyController, preferredRecognizerId);
    stop();

    var collected = MindMapBoxGestureCollector.collectRecognizerEntries(studyController);
    if (!collected || !collected.mindMapView) {
      _log('start failed reason=no-mindmap-view');
      return false;
    }
    _log(
      'collected roots=' + (collected.roots ? collected.roots.length : 0) +
      ' entries=' + (collected.entries ? collected.entries.length : 0) +
      ' mindMapView=' + _className(collected.mindMapView)
    );

    var sourceEntry = MindMapBoxGestureCollector.findSelectionPanEntry(collected, preferredRecognizerId || '2273');
    if (!sourceEntry) {
      _log('start failed reason=no-selection-pan candidates=' + _entriesSummary(collected.entries));
      return false;
    }
    _log('source ' + _entryLabel(sourceEntry));

    var mindMapCanvas = MindMapBoxGestureCollector.findMindMapCanvas(collected);
    if (!mindMapCanvas) {
      _log('start failed reason=no-mindmap-canvas candidates=' + _entriesSummary(collected.entries));
      return false;
    }

    var attachView = sourceEntry.ownerView || collected.mindMapView;
    var beforeCount = _gestureCount(attachView);
    var bridgeRecognizer = null;
    try {
      _log('attach begin attachView=' + _className(attachView) + ' canvas=' + _className(mindMapCanvas) + ' gesturesBefore=' + beforeCount);
      bridgeRecognizer = new UIPanGestureRecognizer(mindMapCanvas, 'handlePanGesture:');
      attachView.addGestureRecognizer(bridgeRecognizer);
    } catch (e) {
      _log('attach failed error=' + String(e));
      return false;
    }

    _bridge = {
      recognizer: bridgeRecognizer,
      view: attachView,
      enabledState: null,
    };

    _log('start end active=true gesturesAfter=' + _gestureCount(attachView) + ' recognizer=' + MindMapShared.safeDescription(bridgeRecognizer));
    _syncBridgeEnabled('bridge.start');
    return true;
  }

  function isActive() {
    return !!_bridge;
  }

  function enableFreeMove(studyController, preferredRecognizerId) {
    _log(
      'freeMove begin active=' + isFreeMoveActive() +
      ' bridgeActive=' + isActive() +
      ' preferred=' + String(preferredRecognizerId || '2273')
    );

    stop();
    _freeMove = null;
    _log('freeMove end ok=true reason=bridge-stopped native=untouched');
    return true;
  }

  function restoreBoxSelect(studyController, preferredRecognizerId) {
    _log(
      'restore begin active=' + isFreeMoveActive() +
      ' bridgeActive=' + isActive() +
      ' preferred=' + String(preferredRecognizerId || '2273')
    );

    _freeMove = null;
    _log('restore end ok=true reason=native-untouched');
    return true;
  }

  function isFreeMoveActive() {
    return false;
  }

  function getNativeSelectionState(studyController, preferredRecognizerId) {
    var entry = _freeMove ? _freeMove.entry : _selectionEntry(studyController, preferredRecognizerId, true);
    if (!entry || !entry.recognizer) {
      return {
        found: false,
        enabled: null,
        state: -1,
        label: 'none',
      };
    }
    return {
      found: true,
      enabled: _enabledValue(entry.recognizer),
      state: _stateValue(entry.recognizer),
      label: _entryLabel(entry),
    };
  }

  function syncPanGate(reason) {
    return _syncBridgeEnabled(reason);
  }

  function getBridgeState() {
    if (!_bridge || !_bridge.recognizer) {
      return {
        found: false,
        enabled: null,
        state: -1,
      };
    }
    return {
      found: true,
      enabled: _enabledValue(_bridge.recognizer),
      state: _stateValue(_bridge.recognizer),
    };
  }

  return {
    start: start,
    stop: stop,
    enableFreeMove: enableFreeMove,
    restoreBoxSelect: restoreBoxSelect,
    isFreeMoveActive: isFreeMoveActive,
    getNativeSelectionState: getNativeSelectionState,
    syncPanGate: syncPanGate,
    getBridgeState: getBridgeState,
    isActive: isActive,
  };
}
