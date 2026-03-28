import Foundation
import AppKit

class AutoUpdater {
    static let shared = AutoUpdater()
    
    private let currentVersion = "1.0.0"
    private let updateURL = URL(string: "https://api.github.com/repos/gaurav-chakraborty/jarvis/releases/latest")!
    private var checkTimer: Timer?
    
    func startChecking(interval: TimeInterval = 3600) {
        checkTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.checkForUpdates()
        }
        checkForUpdates() // Immediate check
    }
    
    func checkForUpdates() {
        let task = URLSession.shared.dataTask(with: updateURL) { [weak self] data, response, error in
            guard let data = data else { return }
            
            do {
                let release = try JSONDecoder().decode(GitHubRelease.self, from: data)
                
                if release.tag_name > self?.currentVersion ?? "0.0.0" {
                    DispatchQueue.main.async {
                        self?.promptUpdate(release)
                    }
                }
            } catch {
                Logger.shared.error("Update check failed: \(error)")
            }
        }
        task.resume()
    }
    
    private func promptUpdate(_ release: GitHubRelease) {
        let alert = NSAlert()
        alert.messageText = "Update Available"
        alert.informativeText = "Jarvis \(release.tag_name) is available.\n\n\(release.body.prefix(200))"
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Update Now")
        alert.addButton(withTitle: "Later")
        
        if alert.runModal() == .alertFirstButtonReturn {
            if let url = URL(string: release.assets.first?.browser_download_url ?? "") {
                NSWorkspace.shared.open(url)
            }
        }
    }
}

struct GitHubRelease: Codable {
    let tag_name: String
    let body: String
    let assets: [Asset]
    
    struct Asset: Codable {
        let browser_download_url: String
        let name: String
    }
}
