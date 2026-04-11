// 脑图控制器共享基础：安全读取原生对象/集合，并通过官方入口解析 mindMapView
const MindMapShared = (function () {
  function safeString(value) {
    try { return String(value); } catch (e) { return '<string error: ' + String(e) + '>'; }
  }

  function safeNumber(value, fallback) {
    var nextFallback = fallback === undefined ? 0 : fallback;
    try {
      var next = Number(value);
      return isNaN(next) ? nextFallback : next;
    } catch (e) {
      return nextFallback;
    }
  }

  function safeDescription(value) {
    try { return safeString(value.description()); } catch (e) { return '<description error: ' + String(e) + '>'; }
  }

  function toArray(collection) {
    if (!collection) return [];
    try { return UIViewTree.toArray(collection); } catch (e) {}
    if (Array.isArray(collection)) return collection;
    return [];
  }

  function getDisplayClassName(value, desc) {
    var direct = UIViewTree.getClassName(value);
    if (direct && direct !== 'Unknown') return direct;

    var text = desc || safeDescription(value);
    var objc = /^<([^:>]+):/.exec(text);
    if (objc && objc[1]) return objc[1];

    var objectTag = /^\[object ([^\]]+)\]$/.exec(text);
    if (objectTag && objectTag[1]) return objectTag[1];

    return direct || 'Unknown';
  }

  function getMindMapTargets(studyController) {
    var notebookController = null;
    var studyRootView = null;
    var mindMapView = null;

    try { notebookController = studyController ? studyController.notebookController : null; } catch (e) { notebookController = null; }
    try { studyRootView = studyController ? studyController.view : null; } catch (e) { studyRootView = null; }
    try {
      if (notebookController && notebookController.mindmapView) {
        mindMapView = notebookController.mindmapView;
      }
    } catch (e) {}
    if (!mindMapView) {
      try {
        if (notebookController && notebookController.mindMapView) {
          mindMapView = notebookController.mindMapView;
        }
      } catch (e) {}
    }

    return {
      studyRootView: studyRootView,
      mindMapView: mindMapView,
    };
  }

  return {
    safeString: safeString,
    safeNumber: safeNumber,
    safeDescription: safeDescription,
    toArray: toArray,
    getDisplayClassName: getDisplayClassName,
    getMindMapTargets: getMindMapTargets,
  };
})();
