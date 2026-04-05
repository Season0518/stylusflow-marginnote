const CanvasToolController = (() => {
  const PICKER_CLASS = 'CanvasToolPicker';
  const TOUCH_UP_INSIDE = 1 << 6;
  const TOUCH_DOWN = 1 << 0;
  const MAX_TRAVERSE_DEPTH = 5;

  function safeValue(obj, key, fallback) {
    try {
      return obj[key] === undefined || obj[key] === null ? fallback : obj[key];
    } catch (e) {
      return fallback;
    }
  }

  function toArray(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    const result = [];
    try {
      const count = typeof collection.count === 'function' ? collection.count() : collection.count;
      for (let i = 0; i < count; i++) result.push(collection.objectAtIndex(i));
      return result;
    } catch (e) {}
    try {
      return Array.from(collection);
    } catch (e) {
      return [];
    }
  }

  function tryGetClassName(view) {
    if (!view) return 'Unknown';
    try {
      if (typeof view.className === 'function') return String(view.className());
      if (view.className) return String(view.className);
      if (view.constructor && view.constructor.name) return String(view.constructor.name);
    } catch (e) {}
    return 'Unknown';
  }

  function subviews(view) {
    return toArray(safeValue(view, 'subviews', []));
  }

  function isVisible(view) {
    if (!view) return false;
    if (safeValue(view, 'hidden', false) === true) return false;
    if (safeValue(view, 'alpha', 1.0) <= 0.01) return false;
    const frame = safeValue(view, 'frame', null);
    if (frame && (frame.width === 0 || frame.height === 0)) return false;
    return true;
  }

  function isActionControl(view) {
    return !!view && typeof view.sendActionsForControlEvents === 'function';
  }

  function getAbsoluteX(view, targetContainer) {
    try {
      return view.convertRectToView(view.bounds, targetContainer).x;
    } catch (e) {
      return safeValue(safeValue(view, 'frame', {}), 'x', 0);
    }
  }

  function find(rootWindow) {
    if (!rootWindow) return null;
    const queue = [rootWindow];
    let head = 0;
    while (head < queue.length) {
      const v = queue[head++];
      if (!v) continue;
      if (tryGetClassName(v) === PICKER_CLASS) return v;
      const children = subviews(v);
      for (let i = 0; i < children.length; i++) queue.push(children[i]);
    }
    return null;
  }

  function detectAllTools(picker) {
    if (!picker) return [];

    const allControls = [];
    const seen = new Set();

    function traverse(node, depth) {
      if (!node || depth > MAX_TRAVERSE_DEPTH || !isVisible(node)) return;
      if (isActionControl(node) && !seen.has(node)) {
        seen.add(node);
        allControls.push(node);
      }
      const children = subviews(node);
      for (let i = 0; i < children.length; i++) traverse(children[i], depth + 1);
    }

    traverse(picker, 0);

    const wrappers = allControls.map(ctrl => ({ view: ctrl, x: getAbsoluteX(ctrl, picker) }));
    wrappers.sort((a, b) => a.x - b.x);
    return wrappers.map((w, m) => ({ slotIndex: m, view: w.view }));
  }

  function activate(toolView) {
    if (!toolView) return false;
    try {
      toolView.sendActionsForControlEvents(TOUCH_UP_INSIDE);
      return true;
    } catch (e) {}
    try {
      toolView.sendActionsForControlEvents(TOUCH_DOWN);
      return true;
    } catch (e) {}
    return false;
  }

  return { find, isVisible, detectAllTools, activate, tryGetClassName };
})();
