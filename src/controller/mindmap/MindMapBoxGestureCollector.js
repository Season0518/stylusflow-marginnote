// 脑图框选手势收集：解析候选根视图并提取手势元信息
const MindMapBoxGestureCollector = (function () {
  var EXTRA_ROOT_KEYWORDS = ['mindmapcanvas', 'pkcanvasview', 'pktiledgestureview'];

  function _extractRecognizerMeta(description) {
    var text = MindMapShared.safeString(description || '');
    var objcClass = '';
    var recognizerId = '';
    var actionName = '';
    var targetClassName = '';

    var objcMatch = /^<([^:>]+):/.exec(text);
    if (objcMatch && objcMatch[1]) objcClass = objcMatch[1];

    var idMatch = /;\s*id\s*=\s*([0-9]+)/.exec(text);
    if (idMatch && idMatch[1]) recognizerId = idMatch[1];

    var actionMatch = /action=([^,>]+)/.exec(text);
    if (actionMatch && actionMatch[1]) actionName = actionMatch[1];

    var targetMatch = /target=<([^ >]+)\s+0x[0-9a-fA-F]+>/.exec(text);
    if (targetMatch && targetMatch[1]) targetClassName = targetMatch[1];

    return {
      objcClass: objcClass,
      recognizerId: recognizerId,
      actionName: actionName,
      targetClassName: targetClassName,
    };
  }

  function _matchesExtraRoot(view) {
    var className = MindMapShared.getDisplayClassName(view).toLowerCase();
    var desc = MindMapShared.safeDescription(view).toLowerCase();
    for (var i = 0; i < EXTRA_ROOT_KEYWORDS.length; i++) {
      if (className.indexOf(EXTRA_ROOT_KEYWORDS[i]) >= 0) return true;
      if (desc.indexOf(EXTRA_ROOT_KEYWORDS[i]) >= 0) return true;
    }
    return false;
  }

  function _collectMatchingDescendantRoots(rootView, excludeSelf) {
    if (!rootView) return [];

    var queue = [rootView];
    var head = 0;
    var roots = [];

    while (head < queue.length) {
      var view = queue[head++];
      if (!view) continue;

      if ((!excludeSelf || view !== rootView) && _matchesExtraRoot(view)) {
        roots.push({ view: view });
      }

      var subviews = UIViewTree.getSubviews(view);
      for (var i = 0; i < subviews.length; i++) queue.push(subviews[i]);
    }

    return roots;
  }

  function _collectMindMapRoots(targets) {
    var roots = [{ view: targets.mindMapView }];
    var descendantRoots = _collectMatchingDescendantRoots(targets.mindMapView, true);
    for (var i = 0; i < descendantRoots.length; i++) roots.push(descendantRoots[i]);

    var hasMindMapCanvas = false;
    for (var j = 0; j < roots.length; j++) {
      if (MindMapShared.getDisplayClassName(roots[j].view) === 'MindMapCanvas') {
        hasMindMapCanvas = true;
        break;
      }
    }

    if (!hasMindMapCanvas && targets.studyRootView) {
      var fallbackRoots = _collectMatchingDescendantRoots(targets.studyRootView, false);
      for (var k = 0; k < fallbackRoots.length; k++) {
        var exists = false;
        for (var x = 0; x < roots.length; x++) {
          if (roots[x].view === fallbackRoots[k].view) {
            exists = true;
            break;
          }
        }
        if (!exists) roots.push(fallbackRoots[k]);
      }
    }

    return roots;
  }

  function collectRecognizerEntries(studyController) {
    var targets = MindMapShared.getMindMapTargets(studyController);
    if (!targets.mindMapView) return null;

    var roots = _collectMindMapRoots(targets);
    var entries = [];
    var seen = [];

    for (var r = 0; r < roots.length; r++) {
      var recognizers = [];
      try { recognizers = MindMapShared.toArray(roots[r].view.gestureRecognizers); } catch (e) { recognizers = []; }
      for (var i = 0; i < recognizers.length; i++) {
        var recognizer = recognizers[i];
        if (seen.indexOf(recognizer) >= 0) continue;

        seen.push(recognizer);
        var state = MindMapShared.safeNumber(recognizer.state, -1);
        var description = MindMapShared.safeDescription(recognizer);
        var meta = _extractRecognizerMeta(description);
        entries.push({
          recognizer: recognizer,
          ownerView: roots[r].view,
          className: meta.objcClass || UIViewTree.getClassName(recognizer),
          description: description,
          recognizerId: meta.recognizerId,
          actionName: meta.actionName,
          targetClassName: meta.targetClassName,
          lastState: state,
          stateCodes: [state],
          firstChangeTick: null,
        });
      }
    }

    return {
      mindMapView: targets.mindMapView,
      roots: roots,
      entries: entries,
    };
  }

  function isMindMapSelectionPan(entry) {
    if (!entry) return false;
    if (entry.className !== 'SelectionPanGesture') return false;
    if (entry.actionName !== 'handlePanGesture:') return false;
    return entry.targetClassName === 'MindMapCanvas';
  }

  function findMindMapCanvas(collected) {
    if (!collected) return null;
    for (var i = 0; i < collected.roots.length; i++) {
      if (MindMapShared.getDisplayClassName(collected.roots[i].view) === 'MindMapCanvas') return collected.roots[i].view;
    }
    for (var j = 0; j < collected.entries.length; j++) {
      if (collected.entries[j].targetClassName === 'MindMapCanvas') {
        try {
          if (MindMapShared.getDisplayClassName(collected.entries[j].ownerView) === 'MindMapCanvas') return collected.entries[j].ownerView;
        } catch (e) {}
      }
    }
    return null;
  }

  function findSelectionPanEntry(collected, preferredId) {
    if (!collected || !collected.entries) return null;
    if (preferredId) {
      for (var i = 0; i < collected.entries.length; i++) {
        if (collected.entries[i].recognizerId === String(preferredId) && isMindMapSelectionPan(collected.entries[i])) {
          return collected.entries[i];
        }
      }
    }
    for (var j = 0; j < collected.entries.length; j++) {
      if (isMindMapSelectionPan(collected.entries[j])) return collected.entries[j];
    }
    return null;
  }

  return {
    collectRecognizerEntries: collectRecognizerEntries,
    findMindMapCanvas: findMindMapCanvas,
    findSelectionPanEntry: findSelectionPanEntry,
  };
})();
