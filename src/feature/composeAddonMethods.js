// 将多个 feature 方法片段合并成 JSB.defineClass 所需的单一方法对象
function composeAddonMethods(features) {
  var result = {};
  for (var i = 0; i < features.length; i++) {
    var feature = features[i];
    for (var key in feature) {
      if (feature.hasOwnProperty(key)) result[key] = feature[key];
    }
  }
  return result;
}
