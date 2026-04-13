#!/usr/bin/env swift
import ApplicationServices
import Darwin
import Foundation

let bindHost = "127.0.0.1"
let spaceKeyCode: Int64 = 49

if CommandLine.arguments.contains("--help") {
  print("Usage: swift scripts/space-http-listener.swift [--port 17364]")
  print("Listens on 127.0.0.1, waits for Space keyup, then replies pon to MarginNote.")
  exit(0)
}

func argumentValue(after flag: String) -> String? {
  guard let index = CommandLine.arguments.firstIndex(of: flag) else { return nil }
  let next = CommandLine.arguments.index(after: index)
  guard next < CommandLine.arguments.endIndex else { return nil }
  return CommandLine.arguments[next]
}

let port = UInt16(argumentValue(after: "--port") ?? "") ?? 17364
let keyupWaitSeconds: DispatchTimeInterval = .seconds(60)

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
    axRole: String,
    axReason: String
  ) {
    self.createdAt = createdAt
    self.receivedAt = receivedAt
    self.pluginTextInput = pluginTextInput
    self.pluginFocusClass = pluginFocusClass
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
    event?.semaphore.signal()
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
      axRole: focus.role,
      axReason: focus.reason
    )
    let wasIdle = keyupState.arm(pending)
    print(
      "[SpaceHTTPListener] armed path=\(requestPath) responsePending=true arm=\(wasIdle ? "new" : "replace") tapAvailable=\(keyupTapAvailable) receivedAt=\(receivedAt) createdAt=\(createdAt.map(String.init) ?? "nil") deltaMs=\(deltaMs.map(String.init) ?? "nil") pluginTextInput=\(pluginTextInput) axTextInput=\(axTextText) trusted=\(focus.trusted) role=\(focus.role) reason=\(focus.reason)"
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
      print(
        "[SpaceHTTPListener] keyup output keyCode=\(keyCode) keyupAt=\(keyupAt) createdAt=\(armed.createdAt.map(String.init) ?? "nil") fromPluginMs=\(armed.createdAt.map { String(keyupAt - $0) } ?? "nil") fromListenerMs=\(keyupAt - armed.receivedAt) pluginTextInput=\(armed.pluginTextInput) pluginFocusClass=\(armed.pluginFocusClass) axRole=\(armed.axRole) axReason=\(armed.axReason) future=emit-keyup-stop-key-http-stop"
      )
      fflush(stdout)
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

func runHTTPServer() {
  let serverFD = Darwin.socket(AF_INET, SOCK_STREAM, 0)
  guard serverFD >= 0 else {
    perror("socket")
    exit(1)
  }

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
    perror("bind")
    Darwin.close(serverFD)
    exit(1)
  }

  guard Darwin.listen(serverFD, SOMAXCONN) == 0 else {
    perror("listen")
    Darwin.close(serverFD)
    exit(1)
  }

  print("[SpaceHTTPListener] listening host=\(bindHost) port=\(port) accessibilityTrusted=\(AXIsProcessTrusted())")
  fflush(stdout)

  while true {
    var clientAddress = sockaddr_storage()
    var clientLength = socklen_t(MemoryLayout<sockaddr_storage>.size)
    let clientFD = withUnsafeMutablePointer(to: &clientAddress) { pointer in
      pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        Darwin.accept(serverFD, $0, &clientLength)
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
let eventTap = installKeyupTap()
DispatchQueue.global(qos: .userInitiated).async {
  runHTTPServer()
}
withExtendedLifetime(eventTap) {
  CFRunLoopRun()
}
