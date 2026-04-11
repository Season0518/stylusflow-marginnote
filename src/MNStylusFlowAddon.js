// 插件主入口：组装三个特性块，生成 JSExtension 实例
function createMNStylusFlowAddon(mainPath) {
  var ctx = { panel: null, shortcutState: { lastToolSlot: -1, lastToolClass: '' } };
  return JSB.defineClass('MNStylusFlowAddon : JSExtension',
    composeAddonMethods([
      lifecycleFeature(ctx, mainPath),
      shortcutFeature(ctx),
      panelEventFeature(ctx),
      documentPanDebugFeature(ctx),
    ])
  );
}
