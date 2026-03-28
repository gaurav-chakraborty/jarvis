import Foundation
import System

class HealthMonitor: ObservableObject {
    static let shared = HealthMonitor()
    
    @Published var healthStatus: HealthStatus = .healthy
    @Published var lastError: Error?
    @Published var uptime: TimeInterval = 0
    @Published var memoryUsage: UInt64 = 0
    @Published var cpuUsage: Double = 0
    
    private var startTime = Date()
    private var timer: Timer?
    private var failureCount = 0
    private let maxFailures = 3
    
    enum HealthStatus {
        case healthy
        case degraded
        case critical
        case restarting
    }
    
    func startMonitoring() {
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.performHealthCheck()
        }
    }
    
    private func performHealthCheck() {
        // Check memory usage
        memoryUsage = getMemoryUsage()
        if memoryUsage > 500_000_000 { // 500MB
            healthStatus = .degraded
            logWarning("High memory usage: \(memoryUsage / 1_000_000)MB")
            triggerMemoryCleanup()
        }
        
        // Check CPU usage
        cpuUsage = getCPUUsage()
        if cpuUsage > 80 {
            healthStatus = .degraded
            logWarning("High CPU usage: \(cpuUsage)%")
        }
        
        // Check audio engine
        if !isAudioEngineHealthy() {
            failureCount += 1
            if failureCount >= maxFailures {
                healthStatus = .critical
                triggerSelfHealing()
            }
        } else {
            failureCount = 0
            if healthStatus == .degraded && memoryUsage < 300_000_000 && cpuUsage < 60 {
                healthStatus = .healthy
            }
        }
        
        uptime = Date().timeIntervalSince(startTime)
    }
    
    private func triggerSelfHealing() {
        healthStatus = .restarting
        logError("Critical failure detected, initiating self-healing")
        
        // Save current state
        saveRecoveryState()
        
        // Restart audio engine
        // AudioAgent.shared.restart() // Assuming AudioAgent exists
        
        // Clear caches
        clearCaches()
        
        // Reset after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.failureCount = 0
            self?.healthStatus = .healthy
            self?.logInfo("Self-healing complete")
        }
    }
    
    private func getMemoryUsage() -> UInt64 {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        return result == KERN_SUCCESS ? info.phys_footprint : 0
    }
    
    private func getCPUUsage() -> Double {
        var totalUsage: Double = 0
        var threadList: thread_act_array_t?
        var threadCount: mach_msg_type_number_t = 0
        
        guard task_threads(mach_task_self_, &threadList, &threadCount) == KERN_SUCCESS else {
            return 0
        }
        
        for i in 0..<Int(threadCount) {
            var threadInfo = thread_basic_info()
            var threadInfoCount = mach_msg_type_number_t(THREAD_INFO_MAX)
            
            let result = withUnsafeMutablePointer(to: &threadInfo) {
                $0.withMemoryRebound(to: integer_t.self, capacity: Int(threadInfoCount)) {
                    thread_info(threadList![i], thread_flavor_t(THREAD_BASIC_INFO), $0, &threadInfoCount)
                }
            }
            
            if result == KERN_SUCCESS && (threadInfo.flags & TH_FLAGS_IDLE) == 0 {
                totalUsage += Double(threadInfo.cpu_usage) / Double(TH_USAGE_SCALE) * 100.0
            }
        }
        
        vm_deallocate(mach_task_self_, vm_address_t(UInt(bitPattern: threadList)), vm_size_t(threadCount) * vm_size_t(MemoryLayout<thread_t>.size))
        return totalUsage
    }
    
    private func isAudioEngineHealthy() -> Bool {
        // return AudioAgent.shared.isRunning
        return true // Placeholder
    }
    
    private func triggerMemoryCleanup() {
        URLCache.shared.removeAllCachedResponses()
        NotificationCenter.default.post(name: .memoryWarning, object: nil)
    }
    
    private func saveRecoveryState() {
        // let state = RecoveryState(
        //     timestamp: Date(),
        //     lastTranscript: AudioAgent.shared.lastTranscript,
        //     context: DecisionEngine.shared.currentContext
        // )
        // RecoveryManager.shared.save(state)
    }
    
    private func clearCaches() {
        // Clear temporary files
        let tempDir = FileManager.default.temporaryDirectory
        try? FileManager.default.removeItem(at: tempDir.appendingPathComponent("jarvis-cache"))
    }
    
    private func logInfo(_ message: String) {
        Logger.shared.info("[Health] \(message)")
    }
    
    private func logWarning(_ message: String) {
        Logger.shared.warning("[Health] \(message)")
    }
    
    private func logError(_ message: String) {
        Logger.shared.error("[Health] \(message)")
    }
}

extension Notification.Name {
    static let memoryWarning = Notification.Name("memoryWarning")
}
