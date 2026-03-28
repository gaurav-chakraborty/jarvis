import Foundation
import os

class Logger {
    static let shared = Logger()
    
    private let logQueue = DispatchQueue(label: "com.jarvis.logger")
    private let logFileURL: URL
    private let osLog = OSLog(subsystem: "com.gaurav.jarvis", category: "Agent")
    
    enum LogLevel: String {
        case debug = "🔍"
        case info = "ℹ️"
        case warning = "⚠️"
        case error = "❌"
        case critical = "🔥"
    }
    
    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let logsDir = appSupport.appendingPathComponent("com.gaurav.jarvis/logs")
        try? FileManager.default.createDirectory(at: logsDir, withIntermediateDirectories: true)
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        logFileURL = logsDir.appendingPathComponent("jarvis_\(dateFormatter.string(from: Date())).log")
    }
    
    func debug(_ message: String, file: String = #file, line: Int = #line) {
        log(.debug, message, file: file, line: line)
    }
    
    func info(_ message: String, file: String = #file, line: Int = #line) {
        log(.info, message, file: file, line: line)
    }
    
    func warning(_ message: String, file: String = #file, line: Int = #line) {
        log(.warning, message, file: file, line: line)
    }
    
    func error(_ message: String, file: String = #file, line: Int = #line) {
        log(.error, message, file: file, line: line)
    }
    
    func critical(_ message: String, file: String = #file, line: Int = #line) {
        log(.critical, message, file: file, line: line)
    }
    
    private func log(_ level: LogLevel, _ message: String, file: String, line: Int) {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let filename = (file as NSString).lastPathComponent
        let logMessage = "\(timestamp) \(level.rawValue) [\(filename):\(line)] \(message)"
        
        // Console output
        os_log("%{public}@", log: osLog, type: level.osLogType, logMessage)
        
        // File output
        logQueue.async { [weak self] in
            guard let self = self else { return }
            if let data = "\(logMessage)\n".data(using: .utf8) {
                if FileManager.default.fileExists(atPath: self.logFileURL.path) {
                    if let handle = try? FileHandle(forWritingTo: self.logFileURL) {
                        handle.seekToEndOfFile()
                        handle.write(data)
                        try? handle.close()
                    }
                } else {
                    try? data.write(to: self.logFileURL)
                }
            }
        }
        
        // Critical errors trigger notification
        if level == .critical {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .criticalError, object: nil, userInfo: ["message": message])
            }
        }
    }
}

extension LogLevel {
    var osLogType: OSLogType {
        switch self {
        case .debug: return .debug
        case .info: return .info
        case .warning: return .error
        case .error: return .error
        case .critical: return .fault
        }
    }
}

extension Notification.Name {
    static let criticalError = Notification.Name("criticalError")
}
