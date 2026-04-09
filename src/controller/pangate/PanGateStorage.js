// PanGate 持久化：NSUserDefaults JSON 读写（纯 save/load，不含业务逻辑）
// 依赖 PanGateConstants（STORAGE_KEY）
const PanGateStorage = (function () {
  var KEY = PanGateConstants.STORAGE_KEY;

  function save(config) {
    try {
      var ud = NSUserDefaults.standardUserDefaults();
      ud.setObjectForKey(JSON.stringify(config), KEY);
      ud.synchronize();
    } catch (e) {
      console.log('[StylusFlow][PanGate] 保存失败: ' + String(e));
    }
  }

  function load() {
    try {
      var ud = NSUserDefaults.standardUserDefaults();
      var text = ud.stringForKey(KEY);
      if (!text || typeof text !== 'string') return null;
      var p = JSON.parse(text);
      return (p && typeof p === 'object') ? p : null;
    } catch (e) {
      console.log('[StylusFlow][PanGate] 加载失败: ' + String(e));
      return null;
    }
  }

  return { save: save, load: load };
})();
