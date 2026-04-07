// iOS view 层级遍历工具函数库（全局对象，供所有模块共享）
const UIViewTree = (function () {

  function safeValue(obj, key, fallback) {
    try {
      var v = obj[key];
      return (v === undefined || v === null) ? fallback : v;
    } catch (e) { return fallback; }
  }

  function toArray(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    var result = [];
    try {
      var count = typeof collection.count === 'function' ? collection.count() : collection.count;
      for (var i = 0; i < count; i++) result.push(collection.objectAtIndex(i));
      return result;
    } catch (e) {}
    try { return Array.prototype.slice.call(collection); } catch (e) { return []; }
  }

  function getClassName(obj) {
    if (!obj) return 'Unknown';
    try {
      if (typeof obj.className === 'function') return String(obj.className());
      if (obj.className) return String(obj.className);
      if (obj.constructor && obj.constructor.name) return String(obj.constructor.name);
    } catch (e) {}
    return 'Unknown';
  }

  function getSubviews(view) {
    return toArray(safeValue(view, 'subviews', []));
  }

  function isVisible(view) {
    if (!view) return false;
    if (safeValue(view, 'hidden', false) === true) return false;
    if (safeValue(view, 'alpha', 1.0) <= 0.01) return false;
    var frame = safeValue(view, 'frame', null);
    if (frame && (frame.width === 0 || frame.height === 0)) return false;
    return true;
  }

  function isActionControl(view) {
    try { return !!view && typeof view.sendActionsForControlEvents === 'function'; } catch (e) { return false; }
  }

  function getAbsoluteX(view, container) {
    try {
      return view.convertRectToView(view.bounds, container).x;
    } catch (e) {
      return safeValue(safeValue(view, 'frame', {}), 'x', 0);
    }
  }

  function triggerTouch(view) {
    if (!view) return false;
    try { view.sendActionsForControlEvents(1 << 6); return true; } catch (e) {}
    try { view.sendActionsForControlEvents(1 << 0); return true; } catch (e) {}
    return false;
  }

  function clearSubviews(view) {
    var subs = view.subviews;
    if (!subs) return;
    for (var i = 0; i < subs.length; i++) subs[i].removeFromSuperview();
  }

  // BFS 查找第一个匹配类名的节点
  function findNodeByClass(rootNode, targetClass) {
    if (!rootNode || !targetClass) return null;
    var queue = [rootNode];
    var head = 0;
    while (head < queue.length) {
      var v = queue[head++];
      if (!v) continue;
      if (getClassName(v) === targetClass) return v;
      var subs = getSubviews(v);
      for (var i = 0; i < subs.length; i++) queue.push(subs[i]);
    }
    return null;
  }

  // DFS 收集所有可见的 ActionControl 节点
  function collectVisibleActionControls(rootNode, maxDepth) {
    var depth = maxDepth === undefined ? 5 : maxDepth;
    var out = [];
    var seen = [];
    function traverse(node, d) {
      if (!node || d > depth || !isVisible(node)) return;
      if (isActionControl(node) && seen.indexOf(node) < 0) {
        seen.push(node);
        out.push(node);
      }
      var subs = getSubviews(node);
      for (var i = 0; i < subs.length; i++) traverse(subs[i], d + 1);
    }
    traverse(rootNode, 0);
    return out;
  }

  return {
    safeValue: safeValue,
    toArray: toArray,
    getClassName: getClassName,
    getSubviews: getSubviews,
    isVisible: isVisible,
    isActionControl: isActionControl,
    getAbsoluteX: getAbsoluteX,
    triggerTouch: triggerTouch,
    clearSubviews: clearSubviews,
    findNodeByClass: findNodeByClass,
    collectVisibleActionControls: collectVisibleActionControls,
  };
})();
