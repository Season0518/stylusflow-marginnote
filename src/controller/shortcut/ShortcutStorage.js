const ShortcutStorage = (() => {
  const STORAGE_KEY = 'stylusflow.shortcuts.bindings.v1';

  function buildInitialDefaultBindings() {
    const commandShift = ShortcutConstants.FLAGS.COMMAND_SHIFT;
    return {
      [ShortcutConstants.ACTIONS.PREV_TOOL]: {
        input: '[',
        flags: commandShift,
        title: ShortcutConstants.toolActionTitle(ShortcutConstants.ACTIONS.PREV_TOOL),
      },
      [ShortcutConstants.ACTIONS.NEXT_TOOL]: {
        input: ']',
        flags: commandShift,
        title: ShortcutConstants.toolActionTitle(ShortcutConstants.ACTIONS.NEXT_TOOL),
      },
    };
  }

  function getDefaults() {
    try {
      return NSUserDefaults.standardUserDefaults();
    } catch (e) {
      return null;
    }
  }

  function loadBindings() {
    const defaults = getDefaults();
    if (!defaults) return {};

    try {
      const text = defaults.stringForKey(STORAGE_KEY);
      if (text && typeof text === 'string') {
        const parsed = JSON.parse(text);
        return sanitizeBindings(parsed);
      }

      const raw = defaults.objectForKey(STORAGE_KEY);
      if (raw && typeof raw === 'object') return sanitizeBindings(raw);

      const seeded = buildInitialDefaultBindings();
      saveBindings(seeded);
      return seeded;
    } catch (e) {
      return {};
    }
  }

  function sanitizeBindings(raw) {
    if (!raw || typeof raw !== 'object') return {};

    const out = {};
    for (const actionId in raw) {
      const item = raw[actionId];
      if (!item || typeof item !== 'object') continue;

      const input = item.input;
      const flags = item.flags;
      if (typeof input !== 'string' || !input) continue;

      out[actionId] = {
        input,
        flags: typeof flags === 'number' ? flags : 0,
        title: typeof item.title === 'string' ? item.title : null,
      };
    }
    return out;
  }

  function saveBindings(bindingsMap) {
    const defaults = getDefaults();
    if (!defaults) return false;

    try {
      defaults.setObjectForKey(JSON.stringify(bindingsMap || {}), STORAGE_KEY);
      defaults.synchronize();
      return true;
    } catch (e) {
      return false;
    }
  }

  return { loadBindings, saveBindings };
})();
