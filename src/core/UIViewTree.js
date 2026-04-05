import { JSB } from './JSB';

export const UIViewTree = {
  getSubviews(view) {
    return JSB.toArray(JSB.safeValue(view, 'subviews', []));
  },

  isVisible(view) {
    if (!view) return false;
    if (JSB.safeValue(view, 'hidden', false) === true) return false;
    if (JSB.safeValue(view, 'alpha', 1.0) <= 0.01) return false;
    const frame = JSB.safeValue(view, 'frame', null);
    if (frame && (frame.width === 0 || frame.height === 0)) return false;
    return true;
  },

  isActionControl(view) {
    try { return !!view && typeof view.sendActionsForControlEvents === 'function'; } catch (e) { return false; }
  },

  getAbsoluteX(view, targetContainer) {
    try {
      return view.convertRectToView(view.bounds, targetContainer).x;
    } catch (e) {
      return JSB.safeValue(JSB.safeValue(view, 'frame', {}), 'x', 0);
    }
  },

  triggerTouch(view) {
    if (!view) return false;
    try { view.sendActionsForControlEvents(1 << 6); return true; } catch (e) {}
    try { view.sendActionsForControlEvents(1 << 0); return true; } catch (e) {}
    return false;
  },

  findNodeByClass(rootNode, targetClass) {
    if (!rootNode || !targetClass) return null;
    const queue = [rootNode];
    let head = 0;
    while (head < queue.length) {
      const v = queue[head++];
      if (!v) continue;
      if (JSB.getClassName(v) === targetClass) return v;
      
      const subs = this.getSubviews(v);
      for (let i = 0; i < subs.length; i++) queue.push(subs[i]);
    }
    return null;
  },

  collectVisibleActionControls(rootNode, maxDepth = 5) {
    const out = [];
    const seen = new Set();

    const traverse = (node, depth) => {
      if (!node || depth > maxDepth || !this.isVisible(node)) return;
      
      if (this.isActionControl(node) && !seen.has(node)) {
        seen.add(node);
        out.push(node);
      }
      
      const subs = this.getSubviews(node);
      for (let i = 0; i < subs.length; i++) traverse(subs[i], depth + 1);
    };

    traverse(rootNode, 0);
    return out;
  }
};