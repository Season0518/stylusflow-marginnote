function createMNStylusFlowAddon(mainPath) {
  return JSB.defineClass(
    "MNStylusFlowAddon : JSExtension",
    {
      sceneWillConnect: function () {
        self.mainPath = mainPath;
        console.log("[StylusFlow] initialized");
      },
      sceneDidDisconnect: function () {
        console.log("[StylusFlow] disconnected");
      },
      queryAddonCommandStatus: function () {
        return {
          image: "icon.png",
          object: self,
          selector: "sayHello:",
          checked: false,
        };
      },
      sayHello: function () {
        console.log("[StylusFlow] Hello, MarginNote!");
      },
    },
  );
}
