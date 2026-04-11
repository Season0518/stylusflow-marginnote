const ShortcutStorage = (() => {
  const STORAGE_KEY = 'stylusflow.shortcuts.bindings.v1';
  const TOOL_COUNT_KEY = 'stylusflow.shortcuts.toolcount.v1';
  const PAN_GATE_STORAGE_KEY = 'stylusflow.pangate.config.v1';
  const ALL_CONFIG_KEYS = [STORAGE_KEY, TOOL_COUNT_KEY, PAN_GATE_STORAGE_KEY];

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

  function saveToolCount(n) {
    const defaults = getDefaults();
    if (!defaults) return false;
    try {
      defaults.setObjectForKey(String(n), TOOL_COUNT_KEY);
      defaults.synchronize();
      return true;
    } catch (e) { return false; }
  }

  function loadToolCount() {
    const defaults = getDefaults();
    if (!defaults) return 0;
    try {
      const raw = defaults.stringForKey(TOOL_COUNT_KEY);
      const n = parseInt(raw, 10);
      return !isNaN(n) && n > 0 ? n : 0;
    } catch (e) { return 0; }
  }

  function clearAllAddonConfigs() {
    const defaults = getDefaults();
    if (!defaults) return false;

    try {
      for (let i = 0; i < ALL_CONFIG_KEYS.length; i++) {
        defaults.removeObjectForKey(ALL_CONFIG_KEYS[i]);
      }
      defaults.synchronize();
      return true;
    } catch (e) {
      return false;
    }
  }

  return { loadBindings, saveBindings, saveToolCount, loadToolCount, clearAllAddonConfigs };
})();
