const ShortcutFormatter = (() => {
  const { FLAGS } = ShortcutConstants;

  const KEY_ALIAS_MAP = Object.freeze({
    space: ' ',
    up: 'UIKeyInputUpArrow',
    down: 'UIKeyInputDownArrow',
    left: 'UIKeyInputLeftArrow',
    right: 'UIKeyInputRightArrow',
    esc: 'UIKeyInputEscape',
    escape: 'UIKeyInputEscape',
    arrowup: 'UIKeyInputUpArrow',
    arrowdown: 'UIKeyInputDownArrow',
    arrowleft: 'UIKeyInputLeftArrow',
    arrowright: 'UIKeyInputRightArrow',
    uikeyinputuparrow: 'UIKeyInputUpArrow',
    uikeyinputdownarrow: 'UIKeyInputDownArrow',
    uikeyinputleftarrow: 'UIKeyInputLeftArrow',
    uikeyinputrightarrow: 'UIKeyInputRightArrow',
    uikeyinputescape: 'UIKeyInputEscape',
  });

  // 特殊按键显示映射
  const KEY_DISPLAY_MAP = Object.freeze({
    ' ': 'Space',
    UIKeyInputUpArrow: '↑',
    UIKeyInputDownArrow: '↓',
    UIKeyInputLeftArrow: '←',
    UIKeyInputRightArrow: '→',
    UIKeyInputEscape: 'Esc',
  });

  function normalizeInput(input) {
    const raw = String(input || '');
    return raw.length === 1 ? raw.toLowerCase() : raw;
  }

  function normalizeCustomInput(input) {
    if (input === ' ') return ' ';
    const raw = String(input || '').trim();
    if (!raw) return null;
    if (raw.length === 1) return raw.toLowerCase();
    return KEY_ALIAS_MAP[raw.toLowerCase()] || null;
  }

  function normalizeFlags(flags) {
    return typeof flags === 'number' ? flags : 0;
  }

  function formatFlags(flags) {
    const parts = [];
    if (flags & FLAGS.COMMAND) parts.push('⌘');
    if (flags & FLAGS.SHIFT) parts.push('⇧');
    if (flags & FLAGS.OPTION) parts.push('⌥');
    if (flags & FLAGS.CONTROL) parts.push('⌃');
    return parts.join('');
  }

  function formatInput(input) {
    return KEY_DISPLAY_MAP[input] || String(input || '');
  }

  function formatShortcutLabel(input, flags) {
    const flagsLabel = formatFlags(flags);
    const inputLabel = formatInput(input);
    return flagsLabel ? `${flagsLabel}${inputLabel}` : inputLabel;
  }

  function timestampLabel() {
    const now = new Date();
    const pad = n => (n < 10 ? `0${n}` : String(n));
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  return {
    normalizeInput,
    normalizeCustomInput,
    normalizeFlags,
    formatFlags,
    formatInput,
    formatShortcutLabel,
    timestampLabel,
  };
})();
