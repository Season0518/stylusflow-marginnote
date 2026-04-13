// PanGate HTTP probe: Space trigger -> loopback listener
const PanGateHttpSignal = (function () {
  var HOST = '127.0.0.1';
  var PATH = '/space';
  var MAX_SCAN = 1200;
  var _inFlight = false;
  var _cachedPort = null;
  var _lastPortErrorReason = '';
  var _stateListener = null;

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

  function _notifyState(reason) {
    if (typeof _stateListener !== 'function') return;
    try { _stateListener(reason); } catch (e) {}
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

  function _defaultsNumber(ud, key) {
    var raw = null;
    try { raw = ud.objectForKey(key); } catch (e) {}
    if (_isNil(raw)) return { ok: false, reason: 'missing' };

    var value = Number(raw);
    try {
      if (isNaN(value) && raw && typeof raw.doubleValue === 'function') value = Number(raw.doubleValue());
      if (isNaN(value) && raw && typeof raw.integerValue === 'function') value = Number(raw.integerValue());
      if (isNaN(value)) value = Number(_safeString(raw));
    } catch (e2) {}

    return isNaN(value)
      ? { ok: false, reason: 'not-number', raw: _safeString(raw) }
      : { ok: true, value: value, raw: _safeString(raw) };
  }

  function _readPublishedPort() {
    try {
      var ud = NSUserDefaults.standardUserDefaults();
      if (ud && typeof ud.synchronize === 'function') ud.synchronize();

      var portValue = _defaultsNumber(ud, PanGateConstants.HTTP_PORT_KEY);
      if (!portValue.ok) {
        return { ok: false, reason: 'companion-port-' + portValue.reason, key: PanGateConstants.HTTP_PORT_KEY };
      }

      var port = Math.floor(portValue.value);
      if (port < 1024 || port > 65535) {
        return { ok: false, reason: 'companion-port-invalid', key: PanGateConstants.HTTP_PORT_KEY, port: port };
      }

      return { ok: true, port: port };
    } catch (e) {
      return { ok: false, reason: 'companion-port-read-error', key: PanGateConstants.HTTP_PORT_KEY, error: _safeString(e) };
    }
  }

  function _refreshPublishedPort(reason, silent) {
    var result = _readPublishedPort();
    if (result.ok) {
      var previousPort = _cachedPort;
      _cachedPort = result.port;
      _lastPortErrorReason = '';
      if (!silent && previousPort !== result.port) {
        try {
          console.log(
            '[StylusFlow PanGateHTTP] port refreshed reason=' + _safeString(reason) +
            ' previous=' + (previousPort === null ? '' : previousPort) +
            ' port=' + result.port
          );
        } catch (e) {}
      }
      return { ok: true, port: result.port, source: 'defaults' };
    }

    _cachedPort = null;
    if (!silent) _logPortError(result);
    return result;
  }

  function _requestPort() {
    if (_cachedPort !== null) return { ok: true, port: _cachedPort, source: 'cache' };
    return _refreshPublishedPort('request', false);
  }

  function _logPortError(result) {
    if (!result || result.ok) return;
    var reason = result.reason || 'unknown';
    if (_lastPortErrorReason === reason) return;
    _lastPortErrorReason = reason;
    try {
      console.log(
        '[StylusFlow PanGateHTTP] error reason=' + reason +
        ' key=' + (result.key || '') +
        (typeof result.port === 'number' ? ' port=' + result.port : '') +
        (result.error ? ' error=' + result.error : '')
      );
    } catch (e) {}
  }

  function _bindingPayload() {
    var trigger = PanGateBindings.getTriggerBinding();
    var stop = PanGateBindings.getStopBinding();
    return {
      triggerInput: trigger ? trigger.input : '',
      triggerFlags: trigger ? trigger.flags : 0,
      triggerDisplay: trigger ? trigger.display : '',
      hasStop: stop ? 1 : 0,
      stopInput: stop ? stop.input : '',
      stopFlags: stop ? stop.flags : 0,
      stopDisplay: stop ? stop.display : '',
      expiredMs: PanGateBindings.getExpiredMs(),
    };
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

  function _isTransportFailure(status, error) {
    return _safeString(status).length === 0 || !!_errorDescription(error);
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
    var published = _requestPort();
    if (!published.ok) {
      _logPortError(published);
      return false;
    }
    _lastPortErrorReason = '';

    var port = published.port;
    var bindings = _bindingPayload();
    var url = 'http://' + HOST + ':' + port + PATH + '?' + _query({
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
      triggerInput: bindings.triggerInput,
      triggerFlags: bindings.triggerFlags,
      triggerDisplay: bindings.triggerDisplay,
      hasStop: bindings.hasStop,
      stopInput: bindings.stopInput,
      stopFlags: bindings.stopFlags,
      stopDisplay: bindings.stopDisplay,
      expiredMs: bindings.expiredMs,
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
        ' port=' + port +
        ' portSource=' + published.source +
        ' pluginTextInput=' + focus.inTextInput +
        ' class=' + focus.className +
        ' reason=' + focus.reason +
        ' checked=' + focus.checked +
        ' trigger=' + bindings.triggerDisplay +
        ' stop=' + bindings.stopDisplay
      );
      _inFlight = true;
      _notifyState('begin');
      NSURLConnection.sendAsynchronousRequestQueueCompletionHandler(
        request,
        NSOperationQueue.mainQueue(),
        function (response, data, error) {
          var endedAt = Date.now();
          var status = _statusCode(response);
          var pon = _isPonResponse(status, data, error);
          var shouldRefreshPort = _isTransportFailure(status, error);
          console.log(
            '[StylusFlow PanGateHTTP] Space notify end elapsedMs=' + (endedAt - createdAt) +
            ' status=' + status +
            ' dataLength=' + _dataLength(data) +
            ' pon=' + pon +
            ' inFlight=false' +
            ' refreshPort=' + shouldRefreshPort +
            ' error=' + _errorDescription(error)
          );
          if (shouldRefreshPort) _refreshPublishedPort('transport-failure', false);
          _inFlight = false;
          _notifyState(pon ? 'pon' : 'end');
        }
      );
      return true;
    } catch (e2) {
      _inFlight = false;
      _notifyState('send-error');
      _cachedPort = null;
      _refreshPublishedPort('send-throw', false);
      try { console.log('[StylusFlow PanGateHTTP] send failed error=' + _safeString(e2)); } catch (e3) {}
      return false;
    }
  }

  function init(stateListener) {
    _stateListener = typeof stateListener === 'function' ? stateListener : null;
    _refreshPublishedPort('load', true);
  }

  function reset(reason) {
    var wasLocked = _inFlight;
    _inFlight = false;
    if (wasLocked) {
      try { console.log('[StylusFlow PanGateHTTP] reset reason=' + _safeString(reason)); } catch (e) {}
      _notifyState('reset.' + _safeString(reason));
    }
  }

  function isInFlight() { return _inFlight; }

  return {
    init: init,
    notifySpace: notifySpace,
    detectFocusedTextInput: detectFocusedTextInput,
    reset: reset,
    isInFlight: isInFlight,
  };
})();
