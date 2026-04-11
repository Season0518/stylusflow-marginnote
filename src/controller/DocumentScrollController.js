// 文档滚动控制：定位主滚动视图并执行平移
const DocumentScrollController = (function () {
  var DEFAULT_PAN_STEP = 40;

  function collectCandidates(view, out) {
    if (!view) return;

    try {
      var contentOffset = view.contentOffset;
      var contentSize = view.contentSize;
      var frame = view.frame;
      if (
        view.hidden === false &&
        contentOffset !== undefined &&
        contentSize &&
        frame &&
        view.scrollEnabled === true &&
        (
          Number(contentSize.height || 0) > Number(frame.height || 0) + 1 ||
          Number(contentSize.width || 0) > Number(frame.width || 0) + 1
        ) &&
        Number(frame.width || 0) > 100 &&
        Number(frame.height || 0) > 100
      ) {
        out.push({
          view: view,
          className: UIViewTree.getClassName(view),
          scrollableY: Number(contentSize.height || 0) - Number(frame.height || 0),
          area: Number(frame.width || 0) * Number(frame.height || 0),
        });
      }
    } catch (e) {}

    var subviews = UIViewTree.toArray(view.subviews);
    for (var i = 0; i < subviews.length; i++) collectCandidates(subviews[i], out);
  }

  function chooseBest(candidates) {
    if (!candidates || !candidates.length) return null;
    candidates.sort(function (left, right) {
      var leftBook = left.className.indexOf('BookScrollView') >= 0 ? 1 : 0;
      var rightBook = right.className.indexOf('BookScrollView') >= 0 ? 1 : 0;
      if (leftBook !== rightBook) return rightBook - leftBook;
      if (left.scrollableY !== right.scrollableY) return right.scrollableY - left.scrollableY;
      return right.area - left.area;
    });
    return candidates[0].view;
  }

  function findScrollTarget(studyController) {
    if (!studyController || !studyController.readerController || !studyController.readerController.view) {
      return null;
    }
    var candidates = [];
    collectCandidates(studyController.readerController.view, candidates);
    return chooseBest(candidates);
  }

  function debugProbe(studyController) {
    if (!studyController || !studyController.readerController || !studyController.readerController.view) {
      return { visited: 0, matches: 0, bestName: 'none' };
    }
    var candidates = [];
    collectCandidates(studyController.readerController.view, candidates);
    var best = chooseBest(candidates);

    return {
      visited: candidates.length,
      matches: candidates.length,
      bestName: best ? UIViewTree.getClassName(best) : 'none',
    };
  }

  function pan(scrollView, dx, dy) {
    if (!scrollView) return false;
    try {
      var currentOffset = scrollView.contentOffset;
      var contentSize = scrollView.contentSize;
      var bounds = scrollView.bounds || scrollView.frame;
      var frame = scrollView.frame || bounds;

      var nextX = Number(currentOffset.x || 0) - Number(dx || 0);
      var nextY = Number(currentOffset.y || 0) - Number(dy || 0);

      var visibleWidth = Number((bounds && bounds.width) || frame.width || 0);
      var visibleHeight = Number((bounds && bounds.height) || frame.height || 0);
      var maxX = Math.max(0, Number(contentSize.width || 0) - visibleWidth);
      var maxY = Math.max(0, Number(contentSize.height || 0) - visibleHeight);

      nextX = Math.max(0, Math.min(nextX, maxX));
      nextY = Math.max(0, Math.min(nextY, maxY));

      if (typeof scrollView.setContentOffsetAnimated === 'function') {
        scrollView.setContentOffsetAnimated({ x: nextX, y: nextY }, false);
      } else {
        scrollView.contentOffset = { x: nextX, y: nextY };
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function panStudyView(studyController, dx, dy) {
    var target = findScrollTarget(studyController);
    if (!target) return false;
    return pan(target, dx, dy);
  }

  return {
    DEFAULT_PAN_STEP: DEFAULT_PAN_STEP,
    findScrollTarget: findScrollTarget,
    pan: pan,
    panStudyView: panStudyView,
    debugProbe: debugProbe,
  };
})();
