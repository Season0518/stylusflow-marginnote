// 脑图框选标定：采样识别器状态变化，选出最像鼠标框选的 SelectionPanGesture
function createMindMapBoxCalibration() {
  var CALIBRATION_INTERVAL = 0.05;
  var CALIBRATION_TICKS = 28;

  var _active = false;
  var _recognizerInfo = null;
  var _timer = null;
  var _tick = 0;
  var _entries = [];

  function _snapshotRecognizerInfo(entry) {
    return {
      className: entry.className,
      recognizerId: entry.recognizerId,
    };
  }

  function _rememberRecognizer(entry) {
    _recognizerInfo = _snapshotRecognizerInfo(entry);
  }

  function _stopSampling() {
    if (_timer) {
      try { _timer.invalidate(); } catch (e) {}
    }
    _timer = null;
    _active = false;
    _tick = 0;
    _entries = [];
  }

  function _continuousScore(entry) {
    var activeCount = 0;
    for (var i = 0; i < entry.stateCodes.length; i++) {
      if (entry.stateCodes[i] !== 0) activeCount += 1;
    }
    if (activeCount >= 3) return 3;
    if (activeCount >= 2) return 2;
    return 0;
  }

  function _keywordScore(entry) {
    var text = (entry.className + ' ' + entry.description).toLowerCase();
    var score = 0;
    if (text.indexOf('selection') >= 0) score += 4;
    if (text.indexOf('select') >= 0) score += 3;
    if (text.indexOf('pan') >= 0) score += 2;
    return score;
  }

  function _sortCandidates(entries) {
    entries.sort(function (left, right) {
      var leftContinuous = _continuousScore(left);
      var rightContinuous = _continuousScore(right);
      if (leftContinuous !== rightContinuous) return rightContinuous - leftContinuous;

      var leftKeyword = _keywordScore(left);
      var rightKeyword = _keywordScore(right);
      if (leftKeyword !== rightKeyword) return rightKeyword - leftKeyword;

      var leftTick = left.firstChangeTick === null ? 999999 : left.firstChangeTick;
      var rightTick = right.firstChangeTick === null ? 999999 : right.firstChangeTick;
      if (leftTick !== rightTick) return leftTick - rightTick;

      return 0;
    });
    return entries;
  }

  function _finishSampling() {
    var activeEntries = [];
    for (var i = 0; i < _entries.length; i++) {
      if (_continuousScore(_entries[i]) > 0) activeEntries.push(_entries[i]);
    }

    if (!activeEntries.length) {
      _recognizerInfo = null;
      _stopSampling();
      return;
    }

    _sortCandidates(activeEntries);
    var best = activeEntries[0];
    _rememberRecognizer(best);
    _stopSampling();
  }

  function _sample(timer) {
    _tick += 1;

    for (var i = 0; i < _entries.length; i++) {
      var entry = _entries[i];
      var nextState = MindMapShared.safeNumber(entry.recognizer.state, -1);
      if (nextState === entry.lastState) continue;

      entry.lastState = nextState;
      entry.stateCodes.push(nextState);
      if (entry.firstChangeTick === null) entry.firstChangeTick = _tick;
    }

    if (_tick >= CALIBRATION_TICKS) {
      try { timer.invalidate(); } catch (e) {}
      _timer = null;
      _finishSampling();
    }
  }

  function captureSelectionPanInstance(studyController, preferredId) {
    var collected = MindMapBoxGestureCollector.collectRecognizerEntries(studyController);
    if (!collected || !collected.mindMapView) {
      return null;
    }

    var entry = MindMapBoxGestureCollector.findSelectionPanEntry(collected, preferredId || '2273');
    if (!entry) {
      return null;
    }

    _rememberRecognizer(entry);
    return entry;
  }

  function start(studyController) {
    var collected = MindMapBoxGestureCollector.collectRecognizerEntries(studyController);
    if (!collected || !collected.mindMapView) {
      return false;
    }

    _stopSampling();
    _recognizerInfo = null;
    _entries = collected.entries;
    _tick = 0;
    _active = true;

    try {
      _timer = NSTimer.scheduledTimerWithTimeInterval(CALIBRATION_INTERVAL, true, function (timer) {
        _sample(timer);
      });
      return true;
    } catch (e) {
      _stopSampling();
      return false;
    }
  }

  function stop() {
    _stopSampling();
  }

  function isActive() {
    return _active;
  }

  function getRecognizerInfo() {
    return _recognizerInfo;
  }

  return {
    captureSelectionPanInstance: captureSelectionPanInstance,
    start: start,
    stop: stop,
    isActive: isActive,
    getRecognizerInfo: getRecognizerInfo,
  };
}
