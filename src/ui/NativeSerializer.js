const NativeSerializer = (() => {
  const MAX_DEPTH = 4;
  const MAX_KEYS = 30;
  const MAX_ARRAY = 20;

  function serialize(value, depth = 0) {
    if (depth > MAX_DEPTH) return '<max depth>';
    if (value === null || value === undefined) return null;

    const valueType = typeof value;
    if (valueType === 'number' || valueType === 'boolean') return value;
    if (valueType === 'string') return value;
    if (valueType === 'function') return `<function ${value.name || ''}>`;

    if (Array.isArray(value)) {
      const out = [];
      const limit = Math.min(value.length, MAX_ARRAY);
      for (let i = 0; i < limit; i++) {
        try {
          out.push(serialize(value[i], depth + 1));
        } catch (e) {
          out.push('<error>');
        }
      }
      if (value.length > MAX_ARRAY) out.push(`... (${value.length} total)`);
      return out;
    }

    try {
      const objectOut = {};
      try {
        const className = CanvasToolController.tryGetClassName
          ? CanvasToolController.tryGetClassName(value)
          : null;
        if (className) objectOut.__class__ = className;
      } catch (e) {}

      const keys = Object.keys(value);
      const keyLimit = Math.min(keys.length, MAX_KEYS);
      for (let i = 0; i < keyLimit; i++) {
        const key = keys[i];
        try {
          objectOut[key] = serialize(value[key], depth + 1);
        } catch (e) {
          objectOut[key] = '<error>';
        }
      }
      if (keys.length > MAX_KEYS) objectOut['...'] = `(${keys.length} keys total)`;
      return objectOut;
    } catch (e) {
      return `<unserializable: ${e.message}>`;
    }
  }

  return { serialize };
})();
