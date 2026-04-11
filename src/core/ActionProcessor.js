// 负责解析动作 ID 并执行工具切换
const ActionProcessor = (function () {

  function resolveTargetSlot(actionId, tools, state) {
    if (!tools || !tools.length) return -1;
    var ACTIONS = ShortcutController.ACTIONS;
    if (actionId === ACTIONS.PREV_TOOL || actionId === ACTIONS.NEXT_TOOL) {
      var current = (typeof state.lastToolSlot === 'number' && state.lastToolSlot >= 0)
        ? state.lastToolSlot : 0;
      var delta = actionId === ACTIONS.NEXT_TOOL ? 1 : -1;
      return (current + delta + tools.length) % tools.length;
    }
    if (actionId && actionId.startsWith('tool.')) {
      var slot = parseInt(actionId.slice(5), 10) - 1;
      if (!isNaN(slot) && slot >= 0 && slot < tools.length) return slot;
    }
    return -1;
  }

  function process(actionId, picker, state) {
    var ctx = state || {};
    if (!picker) {
      var changed = ShortcutController.syncToolCount(0);
      return { handled: false, reason: Strings.errors.noToolbar, bindingListChanged: changed };
    }
    var tools = CanvasToolController.detectAllTools(picker);
    var bindingListChanged = ShortcutController.syncToolCount(tools.length);
    if (!tools.length) {
      return { handled: false, reason: Strings.errors.noTools, bindingListChanged: bindingListChanged };
    }
    var slotIndex = resolveTargetSlot(actionId, tools, ctx);
    if (slotIndex < 0 || slotIndex >= tools.length) {
      return { handled: false, reason: Strings.errors.noMatch, bindingListChanged: bindingListChanged };
    }
    var ACTIONS = ShortcutController.ACTIONS;
    var isAbsolute = actionId !== ACTIONS.PREV_TOOL && actionId !== ACTIONS.NEXT_TOOL && actionId.startsWith('tool.');
    if (isAbsolute) {
      var activeSlot = CanvasToolController.detectActiveSlot(picker);
      if (activeSlot >= 0) ctx.lastToolSlot = activeSlot;
      if (slotIndex === ctx.lastToolSlot && typeof ctx.prevToolSlot === 'number' && ctx.prevToolSlot >= 0 && ctx.prevToolSlot < tools.length) {
        var swapTarget = ctx.prevToolSlot;
        ctx.prevToolSlot = ctx.lastToolSlot;
        slotIndex = swapTarget;
      } else if (typeof ctx.lastToolSlot === 'number' && ctx.lastToolSlot >= 0) {
        ctx.prevToolSlot = ctx.lastToolSlot;
      }
    }
    var target = tools[slotIndex];
    if (!target || !target.view) {
      return { handled: false, reason: Strings.errors.toolUnavailable, bindingListChanged: bindingListChanged };
    }
    if (!CanvasToolController.activate(target.view)) {
      return { handled: false, reason: Strings.errors.activateFailed, bindingListChanged: bindingListChanged };
    }
    ctx.lastToolSlot = slotIndex;
    ctx.lastToolClass = CanvasToolController.tryGetClassName(target.view);
    return {
      handled: true,
      reason: Strings.errors.done,
      slotIndex: slotIndex,
      className: ctx.lastToolClass,
      toolCount: tools.length,
      bindingListChanged: bindingListChanged,
    };
  }

  return { resolveTargetSlot: resolveTargetSlot, process: process };
})();
