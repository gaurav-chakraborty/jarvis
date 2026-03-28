import Cocoa
import SwiftUI
import AVFoundation
import ScreenCaptureKit
import Speech
import Combine
import KeyboardShortcuts

// MARK: - Main Application Entry Point
@main
struct JarvisAgenticApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            SettingsView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    private var windowManager: WindowManager!
    private var audioAgent: AudioAgent!
    private var decisionEngine: DecisionEngine!
    private var apiClient: APIClient!

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide from Dock and App Switcher (stealth)
        NSApp.setActivationPolicy(.accessory)

        // Initialize components
        windowManager = WindowManager.shared
        apiClient = APIClient()
        audioAgent = AudioAgent(apiClient: apiClient)
        decisionEngine = DecisionEngine(audioAgent: audioAgent)

        // Setup global hotkeys
        setupHotkeys()

        // Start listening
        audioAgent.startCapture()

        // Show floating window
        windowManager.createFloatingWindow()

        print("🤖 Jarvis Agentic Mode Active")
    }

    private func setupHotkeys() {
        KeyboardShortcuts.onKeyDown(for: .toggleVisibility) {
            WindowManager.shared.toggleVisibility()
        }

        KeyboardShortcuts.onKeyDown(for: .toggleAutonomy) {
            DecisionEngine.shared.toggleAutonomyMode()
        }

        KeyboardShortcuts.onKeyDown(for: .forceAction) {
            DecisionEngine.shared.forceNextAction()
        }
    }
}

// MARK: - Window Manager (Stealth Window)
class WindowManager: NSObject {
    static let shared = WindowManager()
    private var floatingWindow: NSPanel?
    private var hostingView: NSHostingView<AgenticUI>?
    private var isVisible = true

    func createFloatingWindow() {
        let panel = NSPanel(
            contentRect: NSRect(x: 100, y: 100, width: 480, height: 320),
            styleMask: [.nonactivatingPanel, .titled, .closable, .fullSizeContentView, .resizable],
            backing: .buffered,
            defer: false
        )

        // 🚨 CRITICAL STEALTH CONFIGURATION
        panel.level = .screenSaver + 1  // Above everything
        panel.isFloatingPanel = true
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.alphaValue = 0.92
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.styleMask.insert(.fullSizeContentView)

        // 🚨 INVISIBLE TO SCREEN SHARE
        if #available(macOS 14.0, *) {
            panel.sharingType = .none
        }

        // Disguise as Terminal
        panel.title = "Terminal — bash — 80x24"

        // Add SwiftUI view
        let contentView = AgenticUI()
        hostingView = NSHostingView(rootView: contentView)
        hostingView?.frame = panel.contentView?.bounds ?? NSRect(x: 0, y: 0, width: 480, height: 320)
        hostingView?.autoresizingMask = [.width, .height]
        panel.contentView?.addSubview(hostingView!)

        floatingWindow = panel
        positionInCorner()
        panel.orderFront(nil)
    }

    func positionInCorner() {
        guard let screen = NSScreen.main else { return }
        let screenFrame = screen.visibleFrame
        let windowFrame = floatingWindow?.frame ?? NSRect(x: 0, y: 0, width: 480, height: 320)

        let x = screenFrame.maxX - windowFrame.width - 20
        let y = screenFrame.minY + 20

        floatingWindow?.setFrameOrigin(NSPoint(x: x, y: y))
    }

    func toggleVisibility() {
        isVisible.toggle()
        if isVisible {
            floatingWindow?.orderFront(nil)
        } else {
            floatingWindow?.orderOut(nil)
        }
    }

    func updateUI(with state: AgentDisplayState) {
        DispatchQueue.main.async {
            self.hostingView?.rootView = AgenticUI(state: state)
        }
    }
}

// MARK: - Audio Agent (System Audio Capture)
class AudioAgent: NSObject, ObservableObject, SCStreamDelegate {
    @Published var transcribedText = ""
    @Published var isListening = false
    @Published var confidence: Float = 0.0

    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var stream: SCStream?
    private var apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
        super.init()
        setupSpeechRecognition()
    }

    private func setupSpeechRecognition() {
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    print("✅ Speech recognition authorized")
                default:
                    print("⚠️ Speech recognition not authorized")
                }
            }
        }
    }

    func startCapture() {
        isListening = true

        if #available(macOS 12.3, *) {
            startScreenCaptureKit()
        } else {
            startLegacyAudioCapture()
        }
    }

    @available(macOS 12.3, *)
    private func startScreenCaptureKit() {
        Task {
            do {
                let availableContent = try await SCShareableContent.current
                guard let audioApp = availableContent.applications.first(where: {
                    $0.bundleIdentifier?.contains("teams") == true ||
                    $0.bundleIdentifier?.contains("zoom") == true ||
                    $0.bundleIdentifier?.contains("chrome") == true
                }) else {
                    // Fallback to system audio
                    startLegacyAudioCapture()
                    return
                }

                let filter = SCContentFilter(desktopIndependentWindow: audioApp)
                let config = SCStreamConfiguration()
                config.capturesAudio = true
                config.excludesCurrentProcessAudio = true
                config.channelCount = 2

                stream = SCStream(filter: filter, configuration: config, delegate: self)
                try await stream?.startCapture()
                print("✅ ScreenCaptureKit audio capture started")
            } catch {
                print("⚠️ ScreenCaptureKit failed: \(error)")
                startLegacyAudioCapture()
            }
        }
    }

    private func startLegacyAudioCapture() {
        audioEngine = AVAudioEngine()
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest?.shouldReportPartialResults = true

        guard let inputNode = audioEngine?.inputNode else { return }
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine?.prepare()
        try? audioEngine?.start()

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest!) { [weak self] result, error in
            if let result = result {
                DispatchQueue.main.async {
                    self?.transcribedText = result.bestTranscription.formattedString
                    self?.confidence = result.bestTranscription.segments.first?.confidence ?? 0.5

                    DecisionEngine.shared.processNewInput(
                        text: result.bestTranscription.formattedString,
                        confidence: result.bestTranscription.segments.first?.confidence ?? 0.5
                    )
                }
            }
        }

        print("✅ Legacy audio capture started (BlackHole or mic)")
    }

    func stopCapture() {
        isListening = false
        audioEngine?.stop()
        recognitionTask?.cancel()
        stream?.stopCapture()
    }
}

// MARK: - Decision Engine (Agentic Brain)
class DecisionEngine: ObservableObject {
    static let shared = DecisionEngine(audioAgent: AudioAgent(apiClient: APIClient()))

    @Published var currentState: AgentDisplayState = .listening
    @Published var autonomyLevel: AutonomyLevel = .medium
    @Published var lastDecision: Decision?
    @Published var thinkingChain: [ThinkingStep] = []

    private var audioAgent: AudioAgent
    private var contextMemory: ContextMemory
    private var apiClient: APIClient
    private var cancellables = Set<AnyCancellable>()

    init(audioAgent: AudioAgent) {
        self.audioAgent = audioAgent
        self.contextMemory = ContextMemory()
        self.apiClient = APIClient()
        setupObservation()
    }

    private func setupObservation() {
        audioAgent.$transcribedText
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] text in
                self?.analyzeAndDecide(text)
            }
            .store(in: &cancellables)
    }

    func processNewInput(text: String, confidence: Float) {
        analyzeAndDecide(text)
    }

    func analyzeAndDecide(_ text: String) {
        guard !text.isEmpty else { return }

        currentState = .thinking

        // Step 1: Intent Classification
        let intent = classifyIntent(text)
        addThinkingStep("Intent detected: \(intent.type)", confidence: intent.confidence)

        // Step 2: Context Recall
        let relevantContext = contextMemory.recall(relatedTo: intent.topic)
        addThinkingStep("Recalled \(relevantContext.count) relevant memories", confidence: 0.8)

        // Step 3: Strategy Selection
        let strategy = selectStrategy(for: intent, context: relevantContext)
        addThinkingStep("Selected strategy: \(strategy.name)", confidence: strategy.confidence)

        // Step 4: Generate Response
        generateResponse(for: text, context: relevantContext, strategy: strategy) { [weak self] response in
            guard let self = self else { return }
            self.addThinkingStep("Generated response", confidence: response.confidence)

            // Step 5: Action Decision
            let decision = self.decideAction(response: response, intent: intent, strategy: strategy)

            DispatchQueue.main.async {
                self.lastDecision = decision

                if decision.shouldAct {
                    self.executeAction(decision.action, with: response)
                }

                self.currentState = .listening
            }
        }
    }

    private func classifyIntent(_ text: String) -> Intent {
        let lowerText = text.lowercased()

        if lowerText.contains("?") {
            if lowerText.contains("experience") || lowerText.contains("tell me about") {
                return Intent(type: "experience", topic: "experience", confidence: 0.85)
            } else if lowerText.contains("how") || lowerText.contains("technical") {
                return Intent(type: "technical", topic: "technical", confidence: 0.8)
            } else if lowerText.contains("why") {
                return Intent(type: "motivation", topic: "motivation", confidence: 0.75)
            } else {
                return Intent(type: "general", topic: "general", confidence: 0.6)
            }
        } else {
            return Intent(type: "statement", topic: "unknown", confidence: 0.4)
        }
    }

    private func selectStrategy(for intent: Intent, context: [MemoryItem]) -> Strategy {
        switch intent.type {
        case "experience":
            return Strategy(name: "STAR Method", description: "Structure with Situation, Task, Action, Result", confidence: 0.9)
        case "technical":
            return Strategy(name: "Technical Deep Dive", description: "Provide specifics, metrics, and trade-offs", confidence: 0.85)
        case "motivation":
            return Strategy(name: "Company Alignment", description: "Connect to company values and mission", confidence: 0.8)
        default:
            return Strategy(name: "Concise Answer", description: "Direct, clear response", confidence: 0.7)
        }
    }

    private func generateResponse(for question: String, context: [MemoryItem], strategy: Strategy, completion: @escaping (GeneratedResponse) -> Void) {
        let prompt = """
        You are Jarvis, an AI assistant for a software engineer interview.

        Context from resume and past answers:
        \(context.map { $0.content }.joined(separator: "\n"))

        Strategy to use: \(strategy.name) - \(strategy.description)

        Question: \(question)

        Provide a natural, concise answer that sounds human. Use specific examples if possible.
        """

        apiClient.generateResponse(prompt: prompt) { response in
            completion(GeneratedResponse(
                text: response,
                confidence: 0.85,
                strategy: strategy.name,
                timestamp: Date()
            ))
        }
    }

    private func decideAction(response: GeneratedResponse, intent: Intent, strategy: Strategy) -> Decision {
        var shouldAct = false
        var action: AgentAction = .none
        var reason = ""

        switch autonomyLevel {
        case .low:
            shouldAct = response.confidence > 0.9
            action = .showAndWait
            reason = "Low autonomy: waiting for user confirmation"
        case .medium:
            shouldAct = response.confidence > 0.8
            action = .autoDisplay
            reason = "Medium autonomy: auto-displaying high-confidence answer"
        case .high:
            shouldAct = response.confidence > 0.7
            action = .autoCopyAndDisplay
            reason = "High autonomy: auto-copying and displaying"
        }

        if intent.type == "technical" && response.confidence > 0.85 {
            shouldAct = true
            action = .autoCopyAndDisplay
            reason = "Critical: High-confidence technical answer"
        }

        return Decision(
            shouldAct: shouldAct,
            action: action,
            response: response,
            reasoning: reason,
            confidence: response.confidence
        )
    }

    private func executeAction(_ action: AgentAction, with response: GeneratedResponse) {
        switch action {
        case .showAndWait:
            WindowManager.shared.updateUI(with: .showingAnswer(response.text))
        case .autoDisplay:
            WindowManager.shared.updateUI(with: .autoDisplaying(response.text))
        case .autoCopyAndDisplay:
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(response.text, forType: .string)
            WindowManager.shared.updateUI(with: .copiedAndDisplaying(response.text))
        case .none:
            break
        }

        contextMemory.store(interaction: Interaction(
            question: audioAgent.transcribedText,
            response: response.text,
            action: action,
            timestamp: Date()
        ))
    }

    func toggleAutonomyMode() {
        switch autonomyLevel {
        case .low:   autonomyLevel = .medium
        case .medium: autonomyLevel = .high
        case .high:  autonomyLevel = .low
        }
        WindowManager.shared.updateUI(with: .autonomyChanged(autonomyLevel))
    }

    func forceNextAction() {
        if let lastResponse = lastDecision?.response {
            executeAction(.autoCopyAndDisplay, with: lastResponse)
        }
    }

    private func addThinkingStep(_ description: String, confidence: Float) {
        thinkingChain.append(ThinkingStep(description: description, confidence: confidence, timestamp: Date()))
        if thinkingChain.count > 10 {
            thinkingChain.removeFirst()
        }
    }
}

// MARK: - Data Models
struct Intent {
    let type: String
    let topic: String
    let confidence: Float
}

struct Strategy {
    let name: String
    let description: String
    let confidence: Float
}

struct GeneratedResponse {
    let text: String
    let confidence: Float
    let strategy: String
    let timestamp: Date
}

struct Decision {
    let shouldAct: Bool
    let action: AgentAction
    let response: GeneratedResponse
    let reasoning: String
    let confidence: Float
}

enum AgentAction {
    case none, showAndWait, autoDisplay, autoCopyAndDisplay
}

enum AutonomyLevel {
    case low, medium, high

    var label: String {
        switch self {
        case .low:    return "Low"
        case .medium: return "Medium"
        case .high:   return "High"
        }
    }

    var description: String {
        switch self {
        case .low:    return "Only auto-display at >90% confidence"
        case .medium: return "Auto-display at >80% confidence"
        case .high:   return "Auto-copy + display at >70% confidence"
        }
    }
}

enum AgentDisplayState {
    case listening
    case thinking
    case showingAnswer(String)
    case autoDisplaying(String)
    case copiedAndDisplaying(String)
    case autonomyChanged(AutonomyLevel)
}

struct ThinkingStep {
    let description: String
    let confidence: Float
    let timestamp: Date
}

struct MemoryItem {
    let content: String
    let timestamp: Date
    let type: String
}

struct Interaction {
    let question: String
    let response: String
    let action: AgentAction
    let timestamp: Date
}

class ContextMemory {
    private var memories: [MemoryItem] = []

    func store(interaction: Interaction) {
        memories.append(MemoryItem(
            content: "Q: \(interaction.question)\nA: \(interaction.response)",
            timestamp: interaction.timestamp,
            type: "interaction"
        ))
        if memories.count > 50 {
            memories.removeFirst()
        }
    }

    func recall(relatedTo topic: String) -> [MemoryItem] {
        return memories.filter { $0.content.lowercased().contains(topic.lowercased()) }
    }
}

// MARK: - API Client
class APIClient {
    func generateResponse(prompt: String, completion: @escaping (String) -> Void) {
        let apiKey = ProcessInfo.processInfo.environment["GEMINI_API_KEY"] ?? ""

        guard !apiKey.isEmpty,
              let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=\(apiKey)") else {
            completion("I understand the question. Based on my experience, I would approach this by analyzing the requirements, designing a clear solution, and iterating based on feedback.")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "contents": [["parts": [["text": prompt]]]]
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, _ in
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let candidates = json["candidates"] as? [[String: Any]],
               let content = candidates.first?["content"] as? [String: Any],
               let parts = content["parts"] as? [[String: Any]],
               let text = parts.first?["text"] as? String {
                completion(text)
            } else {
                completion("I understand the question. Based on my experience, I would approach this by analyzing the requirements, designing a clear solution, and iterating based on feedback.")
            }
        }.resume()
    }
}

// MARK: - SwiftUI Views
struct AgenticUI: View {
    var state: AgentDisplayState? = nil
    @StateObject private var decisionEngine = DecisionEngine.shared
    @State private var showingThinking = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: statusIcon)
                    .foregroundColor(statusColor)
                    .font(.title2)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Jarvis Agent")
                        .font(.headline)
                    Text(statusText)
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                HStack(spacing: 4) {
                    Circle()
                        .fill(autonomyColor)
                        .frame(width: 8, height: 8)
                    Text(decisionEngine.autonomyLevel.label)
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
                .padding(6)
                .background(Color.gray.opacity(0.2))
                .cornerRadius(8)

                Button(action: { showingThinking.toggle() }) {
                    Image(systemName: "brain.head.profile")
                        .foregroundColor(.purple)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(.horizontal)
            .padding(.top, 12)

            Divider()

            // Thinking chain (collapsible)
            if showingThinking {
                VStack(alignment: .leading, spacing: 6) {
                    Text("🧠 Thinking Chain")
                        .font(.caption)
                        .foregroundColor(.purple)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(decisionEngine.thinkingChain.indices, id: \.self) { idx in
                                ThinkingBubble(step: decisionEngine.thinkingChain[idx])
                            }
                        }
                    }
                    .frame(height: 40)
                }
                .padding(.horizontal)
            }

            // Main content
            Group {
                switch decisionEngine.currentState {
                case .listening:
                    ListeningView()
                case .thinking:
                    ThinkingView()
                case .showingAnswer(let answer):
                    AnswerView(answer: answer, isAutoCopy: false)
                case .autoDisplaying(let answer):
                    AnswerView(answer: answer, isAutoCopy: false)
                case .copiedAndDisplaying(let answer):
                    AnswerView(answer: answer, isAutoCopy: true)
                case .autonomyChanged(let level):
                    AutonomyChangedView(level: level)
                }
            }
            .padding(.horizontal)

            Spacer(minLength: 8)

            // Quick actions
            HStack {
                Button(action: { decisionEngine.toggleAutonomyMode() }) {
                    Label("Auto Mode", systemImage: "bolt.circle")
                        .font(.caption)
                }
                .buttonStyle(PlainButtonStyle())

                Spacer()

                Button(action: { decisionEngine.forceNextAction() }) {
                    Label("Force Action", systemImage: "play.circle")
                        .font(.caption)
                }
                .buttonStyle(PlainButtonStyle())

                Spacer()

                Text("⌘⇧V | ⌘⇧A")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
            .padding(.horizontal)
            .padding(.bottom, 12)
        }
        .frame(width: 480, height: showingThinking ? 380 : 320)
        .background(VisualEffectView(material: .hudWindow, blendingMode: .behindWindow))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.blue.opacity(0.3), lineWidth: 1)
        )
    }

    private var statusIcon: String {
        switch decisionEngine.currentState {
        case .listening:  return "ear"
        case .thinking:   return "brain.head.profile"
        case .showingAnswer, .autoDisplaying, .copiedAndDisplaying: return "message"
        case .autonomyChanged: return "bolt"
        }
    }

    private var statusColor: Color {
        switch decisionEngine.currentState {
        case .listening:  return .green
        case .thinking:   return .orange
        case .showingAnswer, .autoDisplaying, .copiedAndDisplaying: return .blue
        case .autonomyChanged: return .purple
        }
    }

    private var statusText: String {
        switch decisionEngine.currentState {
        case .listening:  return "Listening to interviewer"
        case .thinking:   return "Analyzing and deciding..."
        case .showingAnswer:  return "Showing suggestion"
        case .autoDisplaying: return "Auto-displayed"
        case .copiedAndDisplaying: return "Copied to clipboard"
        case .autonomyChanged(let level): return "Auto mode: \(level.label)"
        }
    }

    private var autonomyColor: Color {
        switch decisionEngine.autonomyLevel {
        case .low:    return .red
        case .medium: return .orange
        case .high:   return .green
        }
    }
}

struct ListeningView: View {
    @StateObject private var decisionEngine = DecisionEngine.shared

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "mic.circle")
                .font(.system(size: 40))
                .foregroundColor(.green)

            Text("Listening for questions...")
                .font(.subheadline)
        }
        .frame(maxWidth: .infinity, minHeight: 150)
    }
}

struct ThinkingView: View {
    @State private var animationPhase = 0

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 4) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(Color.orange)
                        .frame(width: 8, height: 8)
                        .scaleEffect(animationPhase == i ? 1.2 : 0.8)
                        .animation(
                            Animation.easeInOut(duration: 0.4).repeatForever().delay(Double(i) * 0.2),
                            value: animationPhase
                        )
                }
            }
            .onAppear { animationPhase = 1 }

            Text("Analyzing question...")
                .font(.caption)
                .foregroundColor(.orange)

            Text("Detecting intent → Recalling context → Selecting strategy")
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, minHeight: 150)
    }
}

struct AnswerView: View {
    let answer: String
    let isAutoCopy: Bool
    @State private var isCopied = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if isAutoCopy {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.caption)
                    Text("Auto-copied to clipboard")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }

            ScrollView {
                Text(answer)
                    .font(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(8)
            }
            .frame(maxHeight: 120)

            Button(action: {
                let pasteboard = NSPasteboard.general
                pasteboard.clearContents()
                pasteboard.setString(answer, forType: .string)
                isCopied = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    isCopied = false
                }
            }) {
                Label(isCopied ? "Copied!" : "Copy", systemImage: isCopied ? "checkmark" : "doc.on.doc")
                    .font(.caption)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
}

struct AutonomyChangedView: View {
    let level: AutonomyLevel

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: level == .high ? "bolt.fill" : level == .medium ? "bolt" : "shield")
                .font(.system(size: 30))
                .foregroundColor(level == .high ? .green : level == .medium ? .orange : .red)

            Text("Auto Mode: \(level.label)")
                .font(.headline)

            Text(level.description)
                .font(.caption)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 120)
    }
}

struct ThinkingBubble: View {
    let step: ThinkingStep

    var body: some View {
        HStack(spacing: 4) {
            Text(step.description)
                .font(.caption2)
                .lineLimit(1)

            Circle()
                .fill(confidenceColor)
                .frame(width: 6, height: 6)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.gray.opacity(0.2))
        .cornerRadius(12)
    }

    private var confidenceColor: Color {
        if step.confidence > 0.8 { return .green }
        if step.confidence > 0.6 { return .orange }
        return .red
    }
}

struct VisualEffectView: NSViewRepresentable {
    let material: NSVisualEffectView.Material
    let blendingMode: NSVisualEffectView.BlendingMode

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = blendingMode
        view.state = .active
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}

// MARK: - Keyboard Shortcuts Extension
extension KeyboardShortcuts.Name {
    static let toggleVisibility = Self("toggleVisibility")
    static let toggleAutonomy = Self("toggleAutonomy")
    static let forceAction = Self("forceAction")
}
