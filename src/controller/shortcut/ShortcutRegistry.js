// 纯内存绑定数据结构：不含持久化逻辑
const ShortcutRegistry = (function () {
  var bindings = {};
  var reverseMap = {};
  var bindingCount = 0;

  function _key(input, flags) {
    return input + '__' + flags;
  }

  function clearAll() {
    for (var actionId in bindings) delete bindings[actionId];
    for (var key in reverseMap) delete reverseMap[key];
    bindingCount = 0;
  }

  function set(actionId, input, flags, title, display) {
    if (!actionId || !input) return false;
    var k = _key(input, flags);

    // 幂等：已存在且相同则跳过
    if (reverseMap[k] === actionId && bindings[actionId]) return true;

    // 消除冲突：同一 key 已被另一个 actionId 占用
    var conflicted = reverseMap[k];
    if (conflicted && conflicted !== actionId) {
      delete bindings[conflicted];
      delete reverseMap[k];
      bindingCount--;
    }

    if (!bindings[actionId]) bindingCount++;
    bindings[actionId] = { actionId: actionId, input: input, flags: flags, title: title || actionId, display: display || '' };
    reverseMap[k] = actionId;
    return true;
  }

  function clear(actionId) {
    if (!actionId || !bindings[actionId]) return false;
    var b = bindings[actionId];
    delete reverseMap[_key(b.input, b.flags)];
    delete bindings[actionId];
    bindingCount--;
    return true;
  }

  function get(actionId) {
    return bindings[actionId] || null;
  }

  function getCount() {
    return bindingCount;
  }

  function pruneToSet(validSet) {
    var removed = false;
    var ids = Object.keys(bindings);
    for (var i = 0; i < ids.length; i++) {
      var actionId = ids[i];
      if (!validSet.has(actionId)) {
        var b = bindings[actionId];
        delete reverseMap[_key(b.input, b.flags)];
        delete bindings[actionId];
        bindingCount--;
        removed = true;
      }
    }
    return removed;
  }

  function resolve(input, flags) {
    return reverseMap[_key(input, flags)] || null;
  }

  function query(input, flags) {
    return resolve(input, flags) ? { checked: false, disabled: false } : null;
  }

  function exportAll() {
    var out = {};
    for (var actionId in bindings) {
      var b = bindings[actionId];
      out[actionId] = { input: b.input, flags: b.flags, title: b.title || null };
    }
    return out;
  }

  return {
    set: set,
    clear: clear,
    get: get,
    getCount: getCount,
    clearAll: clearAll,
    pruneToSet: pruneToSet,
    resolve: resolve,
    query: query,
    exportAll: exportAll,
  };
})();
