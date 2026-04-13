// PanGate HTTP probe: Space trigger -> loopback listener
const PanGateHttpSignal = (function () {
  var HOST = '127.0.0.1';
  var PORT = 17364;
  var PATH = '/space';
  var MAX_SCAN = 1200;
  var _inFlight = false;

  function _isNil(value) {
    if (typeof value === 'undefined' || value === null) return true;
    try {
      if (typeof NSNull !== 'undefined' && value instanceof NSNull) return true;
    } catch (e) {}
    return false;
  }

  function _safeString(value) {
    try { return String(value); } catch (e) { return ''; }
  }

  function _className(view) {
    try {
      if (typeof UIViewTree !== 'undefined') return UIViewTree.getClassName(view);
    } catch (e) {}
    try {
      if (view && typeof view.className === 'function') return String(view.className());
      if (view && view.className) return String(view.className);
    } catch (e2) {}
    return '';
  }

  function _getSubviews(view) {
    try {
      if (typeof UIViewTree !== 'undefined') return UIViewTree.getSubviews(view);
    } catch (e) {}
    try {
      return view && view.subviews ? Array.prototype.slice.call(view.subviews) : [];
    } catch (e2) {
      return [];
    }
  }

  function _isVisible(view) {
    try {
      if (typeof UIViewTree !== 'undefined') return UIViewTree.isVisible(view);
    } catch (e) {}
    try {
      if (!view || view.hidden === true) return false;
      if (Number(view.alpha || 1) <= 0.01) return false;
    } catch (e2) {}
    return true;
  }

  function _isFirstResponder(view) {
    try {
      if (view && typeof view.isFirstResponder === 'function') return !!view.isFirstResponder();
    } catch (e) {}
    try {
      return !!(view && view.isFirstResponder === true);
    } catch (e2) {
      return false;
    }
  }

  function _isTextInputClass(name) {
    if (!name) return false;
    return name.indexOf('UITextField') >= 0 ||
      name.indexOf('UITextView') >= 0 ||
      name.indexOf('UISearchBar') >= 0 ||
      name.indexOf('UISearchTextField') >= 0 ||
      name.indexOf('TextField') >= 0 ||
      name.indexOf('TextView') >= 0 ||
      name.indexOf('TextInput') >= 0;
  }

  function detectFocusedTextInput(root) {
    if (!root) return { inTextInput: false, className: '', checked: 0, reason: 'no-root' };

    var queue = [root];
    var head = 0;
    var checked = 0;
    while (head < queue.length && checked < MAX_SCAN) {
      var view = queue[head++];
      checked++;
      if (!view || !_isVisible(view)) continue;

      var className = _className(view);
      if (_isFirstResponder(view)) {
        return {
          inTextInput: _isTextInputClass(className),
          className: className,
          checked: checked,
          reason: 'first-responder',
        };
      }

      var subviews = _getSubviews(view);
      for (var i = 0; i < subviews.length; i++) queue.push(subviews[i]);
    }

    return { inTextInput: false, className: '', checked: checked, reason: 'no-first-responder' };
  }

  function _canSendHTTP() {
    return typeof NSURL !== 'undefined' && NSURL && typeof NSURL.URLWithString === 'function' &&
      typeof NSMutableURLRequest !== 'undefined' && NSMutableURLRequest && typeof NSMutableURLRequest.requestWithURL === 'function' &&
      typeof NSURLConnection !== 'undefined' && NSURLConnection && typeof NSURLConnection.sendAsynchronousRequestQueueCompletionHandler === 'function' &&
      typeof NSOperationQueue !== 'undefined' && NSOperationQueue && typeof NSOperationQueue.mainQueue === 'function';
  }

  function _statusCode(response) {
    if (_isNil(response)) return '';
    try {
      if (typeof response.statusCode === 'function') return _safeString(response.statusCode());
      if (!_isNil(response.statusCode)) return _safeString(response.statusCode);
    } catch (e) {}
    return '';
  }

  function _errorDescription(error) {
    if (_isNil(error)) return '';
    try {
      if (typeof error.localizedDescription === 'function') return _safeString(error.localizedDescription());
      if (!_isNil(error.localizedDescription)) return _safeString(error.localizedDescription);
    } catch (e) {}
    return _safeString(error);
  }

  function _isSuccessStatus(status) {
    var text = _safeString(status);
    return text.length > 0 && text.charAt(0) === '2';
  }

  function _dataLength(data) {
    if (_isNil(data)) return -1;
    try {
      if (typeof data.length === 'function') return Number(data.length());
      if (!_isNil(data.length)) return Number(data.length);
    } catch (e) {}
    return -1;
  }

  function _isPonResponse(status, data, error) {
    return _isSuccessStatus(status) && !_errorDescription(error) && _dataLength(data) === 4;
  }

  function _query(params) {
    var parts = [];
    for (var key in params) {
      if (!params.hasOwnProperty(key)) continue;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(_safeString(params[key])));
    }
    return parts.join('&');
  }

  function _isSpace(input) {
    var normalized = ShortcutFormatter.normalizeInput(input);
    return normalized === ' ' || String(input || '').toLowerCase() === 'space';
  }

  function notifySpace(input, flags, rootWindow) {
    if (!_isSpace(input)) return false;
    if (_inFlight) return false;
    if (!_canSendHTTP()) {
      try { console.log('[StylusFlow PanGateHTTP] skip reason=http-api-unavailable'); } catch (e) {}
      return false;
    }

    var createdAt = Date.now();
    var focus = detectFocusedTextInput(rootWindow);
    var url = 'http://' + HOST + ':' + PORT + PATH + '?' + _query({
      createdAt: createdAt,
      source: 'mn4',
      event: 'keydown',
      input: 'Space',
      keyCode: 49,
      flags: ShortcutFormatter.normalizeFlags(flags),
      pluginTextInput: focus.inTextInput ? 1 : 0,
      pluginFocusClass: focus.className,
      pluginFocusReason: focus.reason,
      pluginChecked: focus.checked,
    });

    try {
      var request = NSMutableURLRequest.requestWithURL(NSURL.URLWithString(url));
      request.setHTTPMethod('GET');
      request.setTimeoutInterval(65);
      if (typeof request.setValueForHTTPHeaderField === 'function') {
        request.setValueForHTTPHeaderField('close', 'Connection');
        request.setValueForHTTPHeaderField('no-store', 'Cache-Control');
      }
      console.log(
        '[StylusFlow PanGateHTTP] Space notify begin createdAt=' + createdAt +
        ' pluginTextInput=' + focus.inTextInput +
        ' class=' + focus.className +
        ' reason=' + focus.reason +
        ' checked=' + focus.checked
      );
      _inFlight = true;
      NSURLConnection.sendAsynchronousRequestQueueCompletionHandler(
        request,
        NSOperationQueue.mainQueue(),
        function (response, data, error) {
          var endedAt = Date.now();
          var status = _statusCode(response);
          var pon = _isPonResponse(status, data, error);
          console.log(
            '[StylusFlow PanGateHTTP] Space notify end elapsedMs=' + (endedAt - createdAt) +
            ' status=' + status +
            ' dataLength=' + _dataLength(data) +
            ' pon=' + pon +
            ' inFlight=false' +
            ' error=' + _errorDescription(error)
          );
          _inFlight = false;
        }
      );
      return true;
    } catch (e2) {
      _inFlight = false;
      try { console.log('[StylusFlow PanGateHTTP] send failed error=' + _safeString(e2)); } catch (e3) {}
      return false;
    }
  }

  function reset(reason) {
    var wasLocked = _inFlight;
    _inFlight = false;
    if (wasLocked) {
      try { console.log('[StylusFlow PanGateHTTP] reset reason=' + _safeString(reason)); } catch (e) {}
    }
  }

  return {
    notifySpace: notifySpace,
    detectFocusedTextInput: detectFocusedTextInput,
    reset: reset,
  };
})();
