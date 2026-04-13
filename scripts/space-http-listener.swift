#!/usr/bin/env swift
import ApplicationServices
import Darwin
import Foundation

let bindHost = "127.0.0.1"
let spaceKeyCode: Int64 = 49
let flagShift: Int64 = 1 << 17
let flagControl: Int64 = 1 << 18
let flagOption: Int64 = 1 << 19
let flagCommand: Int64 = 1 << 20

if CommandLine.arguments.contains("--help") {
  print("Usage: swift scripts/space-http-listener.swift [--port 17364] [--mn-domain QReader.MarginStudy.easy]")
  print("Listens on 127.0.0.1, waits for Space keyup, then replies pon to MarginNote.")
  exit(0)
}

func argumentValue(after flag: String) -> String? {
  guard let index = CommandLine.arguments.firstIndex(of: flag) else { return nil }
  let next = CommandLine.arguments.index(after: index)
  guard next < CommandLine.arguments.endIndex else { return nil }
  return CommandLine.arguments[next]
}

func argumentValues(after flag: String) -> [String] {
  var values: [String] = []
  for index in CommandLine.arguments.indices where CommandLine.arguments[index] == flag {
    let next = CommandLine.arguments.index(after: index)
    if next < CommandLine.arguments.endIndex {
      values.append(CommandLine.arguments[next])
    }
  }
  return values
}

let requestedPort = UInt16(argumentValue(after: "--port") ?? "") ?? 17364
let keyupWaitSeconds: DispatchTimeInterval = .seconds(60)
let portDefaultsKey = "stylusflow.pangate.http.port"
let portUpdatedAtDefaultsKey = "stylusflow.pangate.http.port.updatedAt"
let panGateConfigDefaultsKey = "stylusflow.pangate.config.v1"
let defaultMarginNoteDomains = ["QReader.MarginStudy.easy", "QReader.MarginStudy"]
var signalSources: [DispatchSourceSignal] = []

struct FocusSnapshot {
  let trusted: Bool
  let isTextInput: Bool?
  let role: String
  let subrole: String
  let title: String
  let reason: String
}

final class PendingSpace {
  let createdAt: Int64?
  let receivedAt: Int64
  let pluginTextInput: String
  let pluginFocusClass: String
  let triggerInput: String
  let triggerFlags: String
  let triggerDisplay: String
  let hasStop: String
  let stopInput: String
  let stopFlags: String
  let stopDisplay: String
  let expiredMs: String
  let axRole: String
  let axReason: String
  let semaphore = DispatchSemaphore(value: 0)
  var keyupAt: Int64?
  var keyCode: Int64?

  init(
    createdAt: Int64?,
    receivedAt: Int64,
    pluginTextInput: String,
    pluginFocusClass: String,
    triggerInput: String,
    triggerFlags: String,
    triggerDisplay: String,
    hasStop: String,
    stopInput: String,
    stopFlags: String,
    stopDisplay: String,
    expiredMs: String,
    axRole: String,
    axReason: String
  ) {
    self.createdAt = createdAt
    self.receivedAt = receivedAt
    self.pluginTextInput = pluginTextInput
    self.pluginFocusClass = pluginFocusClass
    self.triggerInput = triggerInput
    self.triggerFlags = triggerFlags
    self.triggerDisplay = triggerDisplay
    self.hasStop = hasStop
    self.stopInput = stopInput
    self.stopFlags = stopFlags
    self.stopDisplay = stopDisplay
    self.expiredMs = expiredMs
    self.axRole = axRole
    self.axReason = axReason
  }
}

final class KeyupState {
  private let lock = NSLock()
  private var pendingSpace: PendingSpace?

  func arm(_ event: PendingSpace) -> Bool {
    lock.lock()
    let wasIdle = pendingSpace == nil
    pendingSpace = event
    lock.unlock()
    return wasIdle
  }

  func completeSpaceKeyup(keyCode: Int64, keyupAt: Int64) -> PendingSpace? {
    guard keyCode == spaceKeyCode else { return nil }
    lock.lock()
    let event = pendingSpace
    pendingSpace = nil
    event?.keyCode = keyCode
    event?.keyupAt = keyupAt
    lock.unlock()
    return event
  }

  func cancel(_ event: PendingSpace) {
    lock.lock()
    if pendingSpace === event {
      pendingSpace = nil
    }
    lock.unlock()
  }
}

let keyupState = KeyupState()
var keyupTapAvailable = false

func nowMs() -> Int64 {
  Int64(Date().timeIntervalSince1970 * 1000)
}

func marginNoteDomains() -> [String] {
  var out = argumentValues(after: "--mn-domain")
  let env = ProcessInfo.processInfo.environment["STYLUSFLOW_MN_DOMAIN"] ?? ""
  for item in env.split(separator: ",") {
    let trimmed = item.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty { out.append(trimmed) }
  }
  if out.isEmpty { out = defaultMarginNoteDomains }

  var seen = Set<String>()
  return out.filter { domain in
    if seen.contains(domain) { return false }
    seen.insert(domain)
    return true
  }
}

func writeContainerPreference(domain: String, port: UInt16, updatedAt: Int64) -> Bool {
  let fm = FileManager.default
  let home = fm.homeDirectoryForCurrentUser.path
  let prefsDir = "\(home)/Library/Containers/\(domain)/Data/Library/Preferences"
  guard fm.fileExists(atPath: prefsDir) else { return false }
  let path = "\(prefsDir)/\(domain).plist"
  let dict = NSMutableDictionary(contentsOfFile: path) ?? NSMutableDictionary()
  dict[portDefaultsKey] = Int(port)
  dict[portUpdatedAtDefaultsKey] = updatedAt
  return dict.write(toFile: path, atomically: true)
}

func readContainerPreferenceValue(domain: String, key: String) -> Any? {
  let fm = FileManager.default
  let home = fm.homeDirectoryForCurrentUser.path
  let path = "\(home)/Library/Containers/\(domain)/Data/Library/Preferences/\(domain).plist"
  guard fm.fileExists(atPath: path),
        let dict = NSDictionary(contentsOfFile: path) else { return nil }
  return dict[key]
}

func readContainerPreferenceString(domain: String, key: String) -> String? {
  readContainerPreferenceValue(domain: domain, key: key) as? String
}

func portFromValue(_ value: Any?) -> UInt16? {
  guard let value = value else { return nil }

  let intValue: Int?
  switch value {
  case let number as NSNumber:
    intValue = number.intValue
  case let string as String:
    intValue = Int(string.trimmingCharacters(in: .whitespacesAndNewlines))
  case let int as Int:
    intValue = int
  case let int64 as Int64:
    intValue = Int(int64)
  default:
    intValue = Int(String(describing: value))
  }

  guard let port = intValue, port >= 1024, port <= 65535 else { return nil }
  return UInt16(port)
}

func readPublishedPort() -> (port: UInt16, source: String)? {
  for domain in marginNoteDomains() {
    if let port = portFromValue(readContainerPreferenceValue(domain: domain, key: portDefaultsKey)) {
      return (port, "container:\(domain)")
    }
    if let port = portFromValue(UserDefaults(suiteName: domain)?.object(forKey: portDefaultsKey)) {
      return (port, "suite:\(domain)")
    }
  }

  if let port = portFromValue(UserDefaults.standard.object(forKey: portDefaultsKey)) {
    return (port, "standard")
  }
  return nil
}

func summarizePanGateConfig(_ text: String) -> String {
  guard let data = text.data(using: .utf8),
        let json = try? JSONSerialization.jsonObject(with: data),
        let dict = json as? [String: Any] else {
    return "parse=false"
  }

  let triggerInput = String(describing: dict["triggerInput"] ?? "")
  let triggerFlags = String(describing: dict["triggerFlags"] ?? "")
  let hasStop = String(describing: dict["hasStopBinding"] ?? "")
  let stopInput = String(describing: dict["stopInput"] ?? "")
  let stopFlags = String(describing: dict["stopFlags"] ?? "")
  let expiredMs = String(describing: dict["expiredMs"] ?? "")
  return "parse=true triggerInput=\(safeLog(triggerInput)) triggerFlags=\(triggerFlags) hasStop=\(hasStop) stopInput=\(safeLog(stopInput)) stopFlags=\(stopFlags) expiredMs=\(expiredMs)"
}

func logStoredPanGateConfig() {
  for domain in marginNoteDomains() {
    if let text = readContainerPreferenceString(domain: domain, key: panGateConfigDefaultsKey) {
      print("[SpaceHTTPListener] configRead ok=true source=container domain=\(domain) \(summarizePanGateConfig(text))")
      fflush(stdout)
      return
    }
    if let text = UserDefaults(suiteName: domain)?.string(forKey: panGateConfigDefaultsKey) {
      print("[SpaceHTTPListener] configRead ok=true source=suite domain=\(domain) \(summarizePanGateConfig(text))")
      fflush(stdout)
      return
    }
  }
  print("[SpaceHTTPListener] configRead ok=false key=\(panGateConfigDefaultsKey) domains=\(marginNoteDomains().joined(separator: ","))")
  fflush(stdout)
}

func writePublishedPort(_ port: UInt16) -> (standardOK: Bool, suiteResults: [String], containerResults: [String], containerOK: Bool) {
  let updatedAt = nowMs()
  UserDefaults.standard.set(Int(port), forKey: portDefaultsKey)
  UserDefaults.standard.set(updatedAt, forKey: portUpdatedAtDefaultsKey)
  let standardOK = UserDefaults.standard.synchronize()

  var suiteResults: [String] = []
  var containerResults: [String] = []
  var containerOK = false
  for domain in marginNoteDomains() {
    if let defaults = UserDefaults(suiteName: domain) {
      defaults.set(Int(port), forKey: portDefaultsKey)
      defaults.set(updatedAt, forKey: portUpdatedAtDefaultsKey)
      suiteResults.append("\(domain):\(defaults.synchronize())")
    } else {
      suiteResults.append("\(domain):false")
    }
    let containerWriteOK = writeContainerPreference(domain: domain, port: port, updatedAt: updatedAt)
    containerOK = containerOK || containerWriteOK
    containerResults.append("\(domain):\(containerWriteOK)")
  }

  return (standardOK, suiteResults, containerResults, containerOK)
}

func publishPort(_ port: UInt16) {
  let result = writePublishedPort(port)

  print("[SpaceHTTPListener] publishPort requested=\(requestedPort) selected=\(port) key=\(portDefaultsKey) updatedAtKey=\(portUpdatedAtDefaultsKey) standard=\(result.standardOK) suites=\(result.suiteResults.joined(separator: ",")) containers=\(result.containerResults.joined(separator: ","))")
  if !result.containerOK {
    print("[SpaceHTTPListener] publishPort error=container-preference-write-failed key=\(portDefaultsKey) domains=\(marginNoteDomains().joined(separator: ","))")
  }
  fflush(stdout)
}

func installSignalCleanup() {
  for signalNumber in [SIGINT, SIGTERM] {
    signal(signalNumber, SIG_IGN)
    let source = DispatchSource.makeSignalSource(signal: signalNumber, queue: DispatchQueue.global(qos: .utility))
    source.setEventHandler {
      print("[SpaceHTTPListener] signal=\(signalNumber) stopping=true")
      fflush(stdout)
      exit(0)
    }
    source.resume()
    signalSources.append(source)
  }
}

func jsonString(_ value: String) -> String {
  var out = "\""
  for scalar in value.unicodeScalars {
    switch scalar {
    case "\"": out += "\\\""
    case "\\": out += "\\\\"
    case "\n": out += "\\n"
    case "\r": out += "\\r"
    case "\t": out += "\\t"
    default: out.unicodeScalars.append(scalar)
    }
  }
  out += "\""
  return out
}

func safeLog(_ value: String, limit: Int = 160) -> String {
  let cleaned = value
    .replacingOccurrences(of: "\r", with: "\\r")
    .replacingOccurrences(of: "\n", with: "\\n")
  return String(cleaned.prefix(limit))
}

func readPayload(from fd: Int32) -> String {
  var buffer = [UInt8](repeating: 0, count: 4096)
  let count = Darwin.read(fd, &buffer, buffer.count)
  guard count > 0 else { return "" }
  return String(bytes: buffer.prefix(count), encoding: .utf8) ?? String(decoding: buffer.prefix(count), as: UTF8.self)
}

func writeAll(_ text: String, to fd: Int32) {
  text.withCString { pointer in
    let length = strlen(pointer)
    var offset = 0
    while offset < length {
      let written = Darwin.write(fd, pointer.advanced(by: offset), length - offset)
      if written <= 0 { break }
      offset += written
    }
  }
}

func requestTarget(from payload: String) -> String {
  let firstLine = payload.components(separatedBy: "\r\n").first ?? ""
  let parts = firstLine.split(separator: " ")
  return parts.count >= 2 ? String(parts[1]) : "/"
}

func queryItems(from target: String) -> [String: String] {
  guard let components = URLComponents(string: "http://localhost\(target)") else { return [:] }
  var out: [String: String] = [:]
  for item in components.queryItems ?? [] {
    out[item.name] = item.value ?? ""
  }
  return out
}

func path(from target: String) -> String {
  URLComponents(string: "http://localhost\(target)")?.path ?? target
}

func int64Value(_ text: String) -> Int64 {
  Int64(text.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
}

func boolValue(_ text: String) -> Bool {
  let normalized = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
  return normalized == "1" || normalized == "true" || normalized == "yes"
}

func cgFlags(from value: Int64) -> CGEventFlags {
  var flags = CGEventFlags()
  if (value & flagShift) != 0 { flags.insert(.maskShift) }
  if (value & flagControl) != 0 { flags.insert(.maskControl) }
  if (value & flagOption) != 0 { flags.insert(.maskAlternate) }
  if (value & flagCommand) != 0 { flags.insert(.maskCommand) }
  return flags
}

func keyCodeForInput(_ input: String) -> CGKeyCode? {
  if input == " " { return 49 }

  let special: [String: CGKeyCode] = [
    "UIKeyInputUpArrow": 126,
    "UIKeyInputDownArrow": 125,
    "UIKeyInputLeftArrow": 123,
    "UIKeyInputRightArrow": 124,
    "UIKeyInputEscape": 53,
  ]
  if let code = special[input] { return code }

  let key = input.lowercased()
  let map: [String: CGKeyCode] = [
    "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7,
    "c": 8, "v": 9, "b": 11, "q": 12, "w": 13, "e": 14, "r": 15,
    "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22,
    "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28, "0": 29,
    "]": 30, "o": 31, "u": 32, "[": 33, "i": 34, "p": 35, "l": 37,
    "j": 38, "'": 39, "k": 40, ";": 41, "\\": 42, ",": 43, "/": 44,
    "n": 45, "m": 46, ".": 47, "`": 50,
  ]
  return map[key]
}

func primaryModifierKeyCode(from flags: Int64) -> CGKeyCode? {
  if (flags & flagCommand) != 0 { return 55 }
  if (flags & flagOption) != 0 { return 58 }
  if (flags & flagControl) != 0 { return 59 }
  if (flags & flagShift) != 0 { return 56 }
  return nil
}

func postKeyEvent(keyCode: CGKeyCode, keyDown: Bool, flags: CGEventFlags) -> Bool {
  guard let event = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: keyDown) else {
    return false
  }
  event.flags = flags
  event.post(tap: .cghidEventTap)
  return true
}

func postModifierEvent(keyCode: CGKeyCode, flags: CGEventFlags) -> Bool {
  guard let event = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true) else {
    return false
  }
  event.flags = flags
  event.type = .flagsChanged
  event.post(tap: .cghidEventTap)
  return true
}

func emitStopEvent(_ pending: PendingSpace) -> (ok: Bool, reason: String, keyCode: String, flags: Int64) {
  guard boolValue(pending.hasStop) else {
    return (false, "no-stop-binding", "", 0)
  }

  let stopFlags = int64Value(pending.stopFlags)
  let eventFlags = cgFlags(from: stopFlags)

  if pending.stopInput.isEmpty {
    guard let modifierKeyCode = primaryModifierKeyCode(from: stopFlags) else {
      return (false, "invalid-modifier-stop", "", stopFlags)
    }
    let downOK = postModifierEvent(keyCode: modifierKeyCode, flags: eventFlags)
    usleep(1_000)
    let upOK = postModifierEvent(keyCode: modifierKeyCode, flags: [])
    return (downOK && upOK, downOK && upOK ? "modifier-only" : "post-failed", String(modifierKeyCode), stopFlags)
  }

  guard let keyCode = keyCodeForInput(pending.stopInput) else {
    return (false, "unsupported-stop-input", "", stopFlags)
  }

  if stopFlags != 0, let modifierKeyCode = primaryModifierKeyCode(from: stopFlags) {
    _ = postModifierEvent(keyCode: modifierKeyCode, flags: eventFlags)
    usleep(1_000)
  }
  let downOK = postKeyEvent(keyCode: keyCode, keyDown: true, flags: eventFlags)
  usleep(1_000)
  let upOK = postKeyEvent(keyCode: keyCode, keyDown: false, flags: eventFlags)
  if stopFlags != 0, let modifierKeyCode = primaryModifierKeyCode(from: stopFlags) {
    usleep(1_000)
    _ = postModifierEvent(keyCode: modifierKeyCode, flags: [])
  }
  return (downOK && upOK, downOK && upOK ? "key" : "post-failed", String(keyCode), stopFlags)
}

func axString(_ element: AXUIElement, _ attribute: String) -> String {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
  guard error == .success, let unwrapped = value else { return "" }
  if let string = unwrapped as? String { return string }
  return String(describing: unwrapped)
}

func axBool(_ element: AXUIElement, _ attribute: String) -> Bool? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
  guard error == .success, let unwrapped = value else { return nil }
  if CFGetTypeID(unwrapped) == CFBooleanGetTypeID() {
    return CFBooleanGetValue((unwrapped as! CFBoolean))
  }
  return unwrapped as? Bool
}

func currentFocusSnapshot() -> FocusSnapshot {
  guard AXIsProcessTrusted() else {
    return FocusSnapshot(
      trusted: false,
      isTextInput: nil,
      role: "",
      subrole: "",
      title: "",
      reason: "accessibility-not-trusted"
    )
  }

  let systemWide = AXUIElementCreateSystemWide()
  var focusedRef: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(systemWide, kAXFocusedUIElementAttribute as CFString, &focusedRef)
  guard error == .success, let focused = focusedRef else {
    return FocusSnapshot(
      trusted: true,
      isTextInput: nil,
      role: "",
      subrole: "",
      title: "",
      reason: "no-focused-element:\(error.rawValue)"
    )
  }

  let element = focused as! AXUIElement
  let role = axString(element, kAXRoleAttribute as String)
  let subrole = axString(element, kAXSubroleAttribute as String)
  let title = axString(element, kAXTitleAttribute as String)
  let editable = axBool(element, "AXEditable")

  let roleLooksText = role == "AXTextField" ||
    role == "AXTextArea" ||
    role == "AXComboBox" ||
    role.contains("Text")
  let isTextInput = roleLooksText && editable != false

  return FocusSnapshot(
    trusted: true,
    isTextInput: isTextInput,
    role: role,
    subrole: subrole,
    title: title,
    reason: editable == nil ? "role-heuristic" : "role-editable"
  )
}

func isValidSpaceKeydown(path requestPath: String, items: [String: String], focus: FocusSnapshot) -> Bool {
  let input = (items["input"] ?? "").lowercased()
  let event = (items["event"] ?? "").lowercased()
  let pluginTextInput = items["pluginTextInput"] ?? ""
  let axTextInput = focus.isTextInput == true
  return requestPath == "/space" &&
    event == "keydown" &&
    input == "space" &&
    pluginTextInput != "1" &&
    !axTextInput
}

func handleClient(_ clientFD: Int32) {
  defer { Darwin.close(clientFD) }

  let payload = readPayload(from: clientFD)
  let receivedAt = nowMs()
  let target = requestTarget(from: payload)
  let requestPath = path(from: target)
  let items = queryItems(from: target)
  let createdAt = Int64(items["createdAt"] ?? "")
  let deltaMs = createdAt.map { receivedAt - $0 }
  let focus = currentFocusSnapshot()
  let input = items["input"] ?? ""
  let event = items["event"] ?? ""
  let pluginTextInput = items["pluginTextInput"] ?? ""
  let pluginFocusClass = items["pluginFocusClass"] ?? ""
  let triggerInput = items["triggerInput"] ?? ""
  let triggerFlags = items["triggerFlags"] ?? ""
  let triggerDisplay = items["triggerDisplay"] ?? ""
  let hasStop = items["hasStop"] ?? ""
  let stopInput = items["stopInput"] ?? ""
  let stopFlags = items["stopFlags"] ?? ""
  let stopDisplay = items["stopDisplay"] ?? ""
  let expiredMs = items["expiredMs"] ?? ""
  let axTextText = focus.isTextInput.map(String.init) ?? "nil"
  let valid = isValidSpaceKeydown(path: requestPath, items: items, focus: focus)

  if valid && !keyupTapAvailable {
    print(
      "[SpaceHTTPListener] rejected path=\(requestPath) reason=keyup-tap-unavailable receivedAt=\(receivedAt) createdAt=\(createdAt.map(String.init) ?? "nil") deltaMs=\(deltaMs.map(String.init) ?? "nil") pluginTextInput=\(pluginTextInput) axTextInput=\(axTextText) trusted=\(focus.trusted)"
    )
    fflush(stdout)
    let body = "tap-unavailable\n"
    let response = "HTTP/1.1 503 Service Unavailable\r\nContent-Type: text/plain\r\nContent-Length: \(body.utf8.count)\r\nConnection: close\r\n\r\n\(body)"
    writeAll(response, to: clientFD)
    return
  }

  if valid {
    let pending = PendingSpace(
      createdAt: createdAt,
      receivedAt: receivedAt,
      pluginTextInput: pluginTextInput,
      pluginFocusClass: pluginFocusClass,
      triggerInput: triggerInput,
      triggerFlags: triggerFlags,
      triggerDisplay: triggerDisplay,
      hasStop: hasStop,
      stopInput: stopInput,
      stopFlags: stopFlags,
      stopDisplay: stopDisplay,
      expiredMs: expiredMs,
      axRole: focus.role,
      axReason: focus.reason
    )
    let wasIdle = keyupState.arm(pending)
    print(
      "[SpaceHTTPListener] armed path=\(requestPath) responsePending=true arm=\(wasIdle ? "new" : "replace") tapAvailable=\(keyupTapAvailable) receivedAt=\(receivedAt) createdAt=\(createdAt.map(String.init) ?? "nil") deltaMs=\(deltaMs.map(String.init) ?? "nil") pluginTextInput=\(pluginTextInput) axTextInput=\(axTextText) trigger=\(safeLog(triggerDisplay)) triggerInput=\(safeLog(triggerInput)) triggerFlags=\(triggerFlags) hasStop=\(hasStop) stop=\(safeLog(stopDisplay)) stopInput=\(safeLog(stopInput)) stopFlags=\(stopFlags) expiredMs=\(expiredMs) trusted=\(focus.trusted) role=\(focus.role) reason=\(focus.reason)"
    )
    fflush(stdout)

    let waitResult = pending.semaphore.wait(timeout: .now() + keyupWaitSeconds)
    if waitResult == .success {
      let keyupAt = pending.keyupAt ?? nowMs()
      let body = "pon\n"
      let response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: \(body.utf8.count)\r\nConnection: close\r\n\r\n\(body)"
      print(
        "[SpaceHTTPListener] pon path=\(requestPath) keyupDone=true keyCode=\(pending.keyCode.map(String.init) ?? "nil") keyupAt=\(keyupAt) createdAt=\(createdAt.map(String.init) ?? "nil") fromPluginMs=\(createdAt.map { String(keyupAt - $0) } ?? "nil") fromListenerMs=\(keyupAt - receivedAt)"
      )
      fflush(stdout)
      writeAll(response, to: clientFD)
    } else {
      keyupState.cancel(pending)
      let body = "keyup-timeout\n"
      let response = "HTTP/1.1 504 Gateway Timeout\r\nContent-Type: text/plain\r\nContent-Length: \(body.utf8.count)\r\nConnection: close\r\n\r\n\(body)"
      print(
        "[SpaceHTTPListener] timeout path=\(requestPath) waitingFor=keyup receivedAt=\(receivedAt) createdAt=\(createdAt.map(String.init) ?? "nil")"
      )
      fflush(stdout)
      writeAll(response, to: clientFD)
    }
  } else {
    print(
      "[SpaceHTTPListener] ignored path=\(requestPath) event=\(event) input=\(input) receivedAt=\(receivedAt) createdAt=\(createdAt.map(String.init) ?? "nil") deltaMs=\(deltaMs.map(String.init) ?? "nil") pluginTextInput=\(pluginTextInput) axTextInput=\(axTextText) trusted=\(focus.trusted) role=\(focus.role) reason=\(focus.reason) payload=\(safeLog(payload))"
    )
    fflush(stdout)
    let body = "ignored\n"
    let response = "HTTP/1.1 409 Conflict\r\nContent-Type: text/plain\r\nContent-Length: \(body.utf8.count)\r\nConnection: close\r\n\r\n\(body)"
    writeAll(response, to: clientFD)
  }
}

let keyupCallback: CGEventTapCallBack = { _, type, event, _ in
  if type == .keyUp {
    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
    let keyupAt = nowMs()
    if let armed = keyupState.completeSpaceKeyup(keyCode: keyCode, keyupAt: keyupAt) {
      let stopResult = emitStopEvent(armed)
      let stopEmittedAt = nowMs()
      print(
        "[SpaceHTTPListener] keyup output keyCode=\(keyCode) keyupAt=\(keyupAt) createdAt=\(armed.createdAt.map(String.init) ?? "nil") fromPluginMs=\(armed.createdAt.map { String(keyupAt - $0) } ?? "nil") fromListenerMs=\(keyupAt - armed.receivedAt) pluginTextInput=\(armed.pluginTextInput) pluginFocusClass=\(armed.pluginFocusClass) trigger=\(safeLog(armed.triggerDisplay)) triggerInput=\(safeLog(armed.triggerInput)) triggerFlags=\(armed.triggerFlags) hasStop=\(armed.hasStop) stop=\(safeLog(armed.stopDisplay)) stopInput=\(safeLog(armed.stopInput)) stopFlags=\(armed.stopFlags) expiredMs=\(armed.expiredMs) stopEmitOK=\(stopResult.ok) stopEmitReason=\(stopResult.reason) stopEmitKeyCode=\(stopResult.keyCode) stopEmitFlags=\(stopResult.flags) stopEmittedAt=\(stopEmittedAt) stopEmitDelayMs=\(stopEmittedAt - keyupAt) axRole=\(armed.axRole) axReason=\(armed.axReason)"
      )
      fflush(stdout)
      armed.semaphore.signal()
    }
  }
  return Unmanaged.passUnretained(event)
}

func installKeyupTap() -> CFMachPort? {
  let eventMask = CGEventMask(1 << CGEventType.keyUp.rawValue)
  guard let eventTap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: eventMask,
    callback: keyupCallback,
    userInfo: nil
  ) else {
    print("[SpaceHTTPListener] keyupTapAvailable=false accessibilityTrusted=\(AXIsProcessTrusted())")
    fflush(stdout)
    return nil
  }

  let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
  CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .commonModes)
  CGEvent.tapEnable(tap: eventTap, enable: true)
  keyupTapAvailable = true
  print("[SpaceHTTPListener] keyupTapAvailable=true accessibilityTrusted=\(AXIsProcessTrusted())")
  fflush(stdout)
  return eventTap
}

func createListeningSocket(port: UInt16) -> Int32? {
  let serverFD = Darwin.socket(AF_INET, SOCK_STREAM, 0)
  guard serverFD >= 0 else { return nil }

  var reuse: Int32 = 1
  setsockopt(serverFD, SOL_SOCKET, SO_REUSEADDR, &reuse, socklen_t(MemoryLayout<Int32>.size))

  var address = sockaddr_in()
  address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
  address.sin_family = sa_family_t(AF_INET)
  address.sin_port = port.bigEndian
  address.sin_addr = in_addr(s_addr: inet_addr(bindHost))

  let bindResult = withUnsafePointer(to: &address) { pointer in
    pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
      Darwin.bind(serverFD, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
    }
  }

  guard bindResult == 0 else {
    Darwin.close(serverFD)
    return nil
  }

  guard Darwin.listen(serverFD, SOMAXCONN) == 0 else {
    Darwin.close(serverFD)
    return nil
  }

  return serverFD
}

func bindFirstAvailablePort(startPort: UInt16, attempts: Int = 50, skipPort: UInt16? = nil) -> (fd: Int32, port: UInt16) {
  let start = Int(startPort)
  for offset in 0..<attempts {
    let candidate = start + offset
    if candidate > 65535 { break }
    let port = UInt16(candidate)
    if skipPort == port { continue }
    if let fd = createListeningSocket(port: port) {
      return (fd, port)
    }
  }

  print("[SpaceHTTPListener] bind failed startPort=\(startPort) attempts=\(attempts)")
  fflush(stdout)
  exit(1)
}

func bindListener() -> (fd: Int32, port: UInt16, publishNeeded: Bool, publishReason: String, publishedSource: String) {
  let published = readPublishedPort()
  if let publishedPort = published?.port {
    if let fd = createListeningSocket(port: publishedPort) {
      let source = published?.source ?? ""
      let primaryContainerSource = marginNoteDomains().first.map { "container:\($0)" } ?? ""
      let shouldPublish = source != primaryContainerSource
      return (fd, publishedPort, shouldPublish, shouldPublish ? "published-port-source-refresh" : "reuse-published", source)
    }

    print("[SpaceHTTPListener] publishedPort unavailable port=\(publishedPort) source=\(published?.source ?? "") action=refresh")
    fflush(stdout)
    let bound = bindFirstAvailablePort(startPort: publishedPort, skipPort: publishedPort)
    return (bound.fd, bound.port, true, "published-port-unavailable", published?.source ?? "")
  }

  let bound = bindFirstAvailablePort(startPort: requestedPort)
  return (bound.fd, bound.port, true, "published-port-missing", "")
}

func runHTTPServer() {
  let bound = bindListener()
  if bound.publishNeeded {
    publishPort(bound.port)
  } else {
    print("[SpaceHTTPListener] reusePublishedPort port=\(bound.port) source=\(bound.publishedSource)")
    fflush(stdout)
  }
  logStoredPanGateConfig()

  print("[SpaceHTTPListener] listening host=\(bindHost) port=\(bound.port) requestedPort=\(requestedPort) publishNeeded=\(bound.publishNeeded) publishReason=\(bound.publishReason) accessibilityTrusted=\(AXIsProcessTrusted())")
  fflush(stdout)

  while true {
    var clientAddress = sockaddr_storage()
    var clientLength = socklen_t(MemoryLayout<sockaddr_storage>.size)
    let clientFD = withUnsafeMutablePointer(to: &clientAddress) { pointer in
      pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        Darwin.accept(bound.fd, $0, &clientLength)
      }
    }

    if clientFD < 0 {
      if errno == EINTR { continue }
      perror("accept")
      continue
    }

    handleClient(clientFD)
  }
}

signal(SIGPIPE, SIG_IGN)
installSignalCleanup()
let eventTap = installKeyupTap()
DispatchQueue.global(qos: .userInitiated).async {
  runHTTPServer()
}
withExtendedLifetime(eventTap) {
  CFRunLoopRun()
}
