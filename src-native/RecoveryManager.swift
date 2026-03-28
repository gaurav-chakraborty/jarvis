import Foundation

class RecoveryManager {
    static let shared = RecoveryManager()
    
    private let recoveryPath: URL
    private let maxRecoveryPoints = 5
    
    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        recoveryPath = appSupport.appendingPathComponent("com.gaurav.jarvis/recovery")
        try? FileManager.default.createDirectory(at: recoveryPath, withIntermediateDirectories: true)
    }
    
    func save(_ state: RecoveryState) {
        let filename = "recovery_\(Int(state.timestamp.timeIntervalSince1970)).json"
        let fileURL = recoveryPath.appendingPathComponent(filename)
        
        do {
            let data = try JSONEncoder().encode(state)
            try data.write(to: fileURL)
            cleanupOldRecoveryPoints()
        } catch {
            Logger.shared.error("Failed to save recovery state: \(error)")
        }
    }
    
    func loadLatest() -> RecoveryState? {
        let files = try? FileManager.default.contentsOfDirectory(at: recoveryPath, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }
            .sorted { $0.lastPathComponent > $1.lastPathComponent }
        
        guard let latest = files?.first else { return nil }
        
        do {
            let data = try Data(contentsOf: latest)
            return try JSONDecoder().decode(RecoveryState.self, from: data)
        } catch {
            Logger.shared.error("Failed to load recovery state: \(error)")
            return nil
        }
    }
    
    private func cleanupOldRecoveryPoints() {
        let files = try? FileManager.default.contentsOfDirectory(at: recoveryPath, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }
            .sorted { $0.lastPathComponent > $1.lastPathComponent }
        
        guard let files = files, files.count > maxRecoveryPoints else { return }
        
        for file in files[maxRecoveryPoints...] {
            try? FileManager.default.removeItem(at: file)
        }
    }
}

struct RecoveryState: Codable {
    let timestamp: Date
    let lastTranscript: String?
    // let context: InterviewContext? // Context type needs to be defined
}
