export const JSB = {
  safeValue(obj, key, fallback = null) {
    try {
      const value = obj[key];
      return value === undefined || value === null ? fallback : value;
    } catch (e) { return fallback; }
  },

  toArray(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    const result = [];
    try {
      const count = typeof collection.count === 'function' ? collection.count() : collection.count;
      for (let i = 0; i < count; i++) result.push(collection.objectAtIndex(i));
      return result;
    } catch (e) {}
    try { return Array.prototype.slice.call(collection); } catch (e) { return []; }
  },

  getClassName(obj) {
    if (!obj) return 'Unknown';
    try {
      if (typeof obj.className === 'function') return String(obj.className());
      if (obj.className) return String(obj.className);
      if (obj.constructor && obj.constructor.name) return String(obj.constructor.name);
    } catch (e) {}
    return 'Unknown';
  }
};