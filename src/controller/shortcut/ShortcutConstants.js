const ShortcutConstants = (() => {
  const FLAGS_SHIFT = 1 << 17;
  const FLAGS_CONTROL = 1 << 18;
  const FLAGS_OPTION = 1 << 19;
  const FLAGS_COMMAND = 1 << 20;
  const FLAGS_COMMAND_SHIFT = FLAGS_COMMAND | FLAGS_SHIFT;

  const FLAGS = Object.freeze({
    SHIFT: FLAGS_SHIFT,
    CONTROL: FLAGS_CONTROL,
    OPTION: FLAGS_OPTION,
    COMMAND: FLAGS_COMMAND,
    COMMAND_SHIFT: FLAGS_COMMAND_SHIFT,
  });

  const ACTIONS = Object.freeze({
    PREV_TOOL: 'tool.prev',
    NEXT_TOOL: 'tool.next',
  });

  const ACTION_TITLES = {
    [ACTIONS.PREV_TOOL]: Strings.actions.prevTool,
    [ACTIONS.NEXT_TOOL]: Strings.actions.nextTool,
  };

  const DEFAULT_TOOL_COUNT = 8;

  function getToolActionId(index) {
    return `tool.${index}`;
  }

  function toolActionTitle(actionId) {
    if (ACTION_TITLES[actionId]) return ACTION_TITLES[actionId];
    if (actionId && actionId.startsWith('tool.')) {
      const num = parseInt(actionId.slice(5), 10);
      if (num >= 1) return Strings.actions.toolSlot(num);
    }
    return Strings.actions.unknown;
  }

  return {
    FLAGS,
    ACTIONS,
    ACTION_TITLES,
    DEFAULT_TOOL_COUNT,
    getToolActionId,
    toolActionTitle,
  };
})();
