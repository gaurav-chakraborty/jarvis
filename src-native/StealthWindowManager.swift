import Cocoa
import SwiftUI

class StealthWindowManager: NSObject {
    static let shared = StealthWindowManager()
    
    private var floatingWindow: NSPanel?
    private var hostingView: NSHostingView<StealthOverlayView>?
    private var isVisible = true
    private var stealthMode: StealthMode = .transparent
    private var clickThroughEnabled = true
    
    enum StealthMode {
        case transparent      // Fully transparent background
        case edgeOnly        // Only show a thin colored edge
        case peek            // Appears only when needed
        case minimal         // Minimal text only
    }
    
    func createFloatingWindow() {
        // Create a borderless, non-activating panel
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 520, height: 400),
            styleMask: [.nonactivatingPanel, .borderless, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        
        // 🚨 ULTIMATE STEALTH CONFIGURATION
        panel.level = .screenSaver + 2  // Above everything but invisible to capture
        panel.isFloatingPanel = true
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .stationary,
            .ignoresCycle
        ]
        
        // 🎯 FULL TRANSPARENCY
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.alphaValue = 1.0  // Full alpha for content, background is clear
        
        // 🔓 CLICK-THROUGH MODE - Doesn't block underlying apps
        panel.ignoresMouseEvents = clickThroughEnabled
        panel.isMovableByWindowBackground = false  // Can't move (avoids accidental interaction)
        
        // 🚫 INVISIBLE TO SCREEN CAPTURE
        if #available(macOS 14.0, *) {
            panel.sharingType = .none
        }
        
        // 🎭 DISGUISE AS SYSTEM PROCESS
        panel.title = ""
        panel.identifier = NSUserInterfaceItemIdentifier("com.apple.backgroundtask")
        
        // Add SwiftUI view with transparent background
        let contentView = StealthOverlayView()
        hostingView = NSHostingView(rootView: contentView)
        hostingView?.frame = panel.contentView?.bounds ?? NSRect(x: 0, y: 0, width: 520, height: 400)
        hostingView?.autoresizingMask = [.width, .height]
        hostingView?.wantsLayer = true
        hostingView?.layer?.backgroundColor = NSColor.clear.cgColor
        
        panel.contentView?.addSubview(hostingView!)
        
        floatingWindow = panel
        positionInCorner()
        panel.orderFront(nil)
        
        // Start with peek mode to minimize visual footprint
        setStealthMode(.peek)
    }
    
    func setStealthMode(_ mode: StealthMode) {
        stealthMode = mode
        updateWindowAppearance()
    }
    
    func updateWindowAppearance() {
        guard let window = floatingWindow else { return }
        
        switch stealthMode {
        case .transparent:
            window.alphaValue = 0.95
            window.ignoresMouseEvents = true
            window.backgroundColor = .clear
            
        case .edgeOnly:
            window.alphaValue = 0.3
            window.ignoresMouseEvents = true
            window.backgroundColor = .clear
            // Show only a thin colored edge (implemented in SwiftUI)
            
        case .peek:
            window.alphaValue = 0.0
            window.ignoresMouseEvents = true
            // Window invisible until needed
            
        case .minimal:
            window.alphaValue = 0.85
            window.ignoresMouseEvents = false
            window.backgroundColor = NSColor.clear
        }
        
        // Update UI
        hostingView?.rootView = StealthOverlayView(stealthMode: stealthMode)
    }
    
    func peek() {
        guard stealthMode == .peek else { return }
        
        // Temporarily show window
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            floatingWindow?.animator().alphaValue = 0.85
        }
        
        // Auto-hide after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.5
                self?.floatingWindow?.animator().alphaValue = 0.0
            }
        }
    }
    
    func updateDisplay(with content: StealthContent) {
        DispatchQueue.main.async {
            self.hostingView?.rootView = StealthOverlayView(
                stealthMode: self.stealthMode,
                content: content
            )
            
            // Peek if in peek mode
            if self.stealthMode == .peek && !content.transcript.isEmpty {
                self.peek()
            }
        }
    }
    
    func toggleClickThrough() {
        clickThroughEnabled.toggle()
        floatingWindow?.ignoresMouseEvents = clickThroughEnabled
    }
    
    func positionInCorner() {
        guard let screen = NSScreen.main else { return }
        let screenFrame = screen.visibleFrame
        let windowFrame = floatingWindow?.frame ?? NSRect(x: 0, y: 0, width: 520, height: 400)
        
        // Position in bottom-right corner with slight offset
        let x = screenFrame.maxX - windowFrame.width - 10
        let y = screenFrame.minY + 10
        
        floatingWindow?.setFrameOrigin(NSPoint(x: x, y: y))
    }
}

// MARK: - Stealth Overlay View (Fully Transparent)
struct StealthOverlayView: View {
    var stealthMode: StealthWindowManager.StealthMode = .transparent
    var content: StealthContent = StealthContent()
    
    @State private var isHovering = false
    @State private var showReasoning = false
    
    var body: some View {
        ZStack {
            // 🎯 COMPLETELY TRANSPARENT BACKGROUND
            Color.clear
                .contentShape(Rectangle())
                .onHover { hovering in
                    isHovering = hovering
                    if hovering && stealthMode == .minimal {
                        NSCursor.pointingHand.set()
                    }
                }
            
            // Only show content in non-peek mode or when hovering
            if stealthMode != .peek || isHovering {
                VStack(spacing: 8) {
                    // Edge indicator (for edge-only mode)
                    if stealthMode == .edgeOnly {
                        EdgeIndicatorView()
                            .padding(.top, 2)
                    }
                    
                    // Voice-to-Text Transcription (Subtle)
                    if !content.transcript.isEmpty {
                        TranscriptView(text: content.transcript, confidence: content.confidence)
                            .opacity(0.7)  // Subtle visibility
                    }
                    
                    // Reasoning Path (Collapsible, Transparent)
                    if !content.reasoning.isEmpty {
                        ReasoningPathView(
                            steps: content.reasoning,
                            isExpanded: $showReasoning
                        )
                        .opacity(0.65)
                        .background(
                            VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                                .opacity(0.3)
                        )
                        .cornerRadius(8)
                    }
                    
                    // Suggested Response (Higher opacity for readability)
                    if !content.response.isEmpty {
                        ResponseView(
                            response: content.response,
                            confidence: content.responseConfidence,
                            isAutoCopy: content.autoCopied
                        )
                        .opacity(0.85)
                        .background(
                            VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                                .opacity(0.4)
                        )
                        .cornerRadius(8)
                    }
                    
                    // Quick Controls (Invisible until hover)
                    if isHovering {
                        ControlBarView()
                            .opacity(0.5)
                            .transition(.opacity)
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .frame(width: 520, height: min(CGFloat(100 + content.reasoning.count * 30 + 80), 400))
        .background(Color.clear)
    }
}

// MARK: - Transcript View (Subtle, Floating)
struct TranscriptView: View {
    let text: String
    let confidence: Float
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "mic")
                .font(.system(size: 10))
                .foregroundColor(.gray.opacity(0.6))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(text)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
                    .lineLimit(2)
                
                // Confidence indicator (subtle)
                HStack(spacing: 2) {
                    ForEach(0..<5) { i in
                        Circle()
                            .fill(Color.green.opacity(
                                Double(confidence) > Double(i) * 0.2 ? 0.5 : 0.2
                            ))
                            .frame(width: 3, height: 3)
                    }
                }
            }
        }
        .padding(6)
        .background(
            VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                .opacity(0.25)
        )
        .cornerRadius(6)
    }
}

// MARK: - Reasoning Path (Transparent Thought Bubbles)
struct ReasoningPathView: View {
    let steps: [ReasoningStep]
    @Binding var isExpanded: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Header
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 10))
                        .foregroundColor(.purple.opacity(0.6))
                    
                    Text("Reasoning")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.gray.opacity(0.7))
                    
                    Spacer()
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 8))
                        .foregroundColor(.gray.opacity(0.5))
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(steps.indices, id: \.self) { index in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(confidenceColor(steps[index].confidence))
                                .frame(width: 4, height: 4)
                            
                            Text(steps[index].description)
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.5))
                                .lineLimit(1)
                            
                            if steps[index].confidence > 0.8 {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 6))
                                    .foregroundColor(.green.opacity(0.5))
                            }
                        }
                    }
                }
                .padding(.leading, 8)
            }
        }
        .padding(6)
    }
    
    private func confidenceColor(_ confidence: Float) -> Color {
        if confidence > 0.8 { return .green.opacity(0.6) }
        if confidence > 0.6 { return .orange.opacity(0.5) }
        return .red.opacity(0.4)
    }
}

// MARK: - Response View (Readable but Transparent)
struct ResponseView: View {
    let response: String
    let confidence: Float
    let isAutoCopy: Bool
    
    @State private var isCopied = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header with status
            HStack {
                Image(systemName: isAutoCopy ? "bolt.circle.fill" : "message")
                    .font(.system(size: 10))
                    .foregroundColor(isAutoCopy ? .green.opacity(0.7) : .blue.opacity(0.6))
                
                Text(isAutoCopy ? "Auto-copied" : "Suggestion")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.gray.opacity(0.7))
                
                Spacer()
                
                // Confidence meter (subtle)
                HStack(spacing: 2) {
                    ForEach(0..<5) { i in
                        Rectangle()
                            .fill(Color.blue.opacity(
                                Double(confidence) > Double(i) * 0.2 ? 0.5 : 0.2
                            ))
                            .frame(width: 12, height: 2)
                    }
                }
            }
            
            // Response text
            Text(response)
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.white.opacity(0.85))
                .lineLimit(4)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            // Quick copy button (invisible until hover)
            if !isAutoCopy {
                Button(action: {
                    let pasteboard = NSPasteboard.general
                    pasteboard.clearContents()
                    pasteboard.setString(response, forType: .string)
                    isCopied = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        isCopied = false
                    }
                }) {
                    HStack {
                        Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 8))
                        Text(isCopied ? "Copied" : "Copy")
                            .font(.system(size: 8))
                    }
                    .foregroundColor(.gray.opacity(0.6))
                }
                .buttonStyle(PlainButtonStyle())
                .opacity(0.5)
            }
        }
        .padding(8)
    }
}

// MARK: - Edge Indicator (For Edge-Only Mode)
struct EdgeIndicatorView: View {
    @State private var isPulsing = false
    
    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<3) { _ in
                Circle()
                    .fill(Color.blue.opacity(isPulsing ? 0.6 : 0.3))
                    .frame(width: 4, height: 4)
            }
        }
        .onAppear {
            withAnimation(Animation.easeInOut(duration: 1).repeatForever()) {
                isPulsing.toggle()
            }
        }
    }
}

// MARK: - Control Bar (Hover-Only)
struct ControlBarView: View {
    var body: some View {
        HStack(spacing: 12) {
            Button(action: { StealthWindowManager.shared.setStealthMode(.transparent) }) {
                Image(systemName: "circle")
                    .font(.system(size: 8))
            }
            Button(action: { StealthWindowManager.shared.setStealthMode(.edgeOnly) }) {
                Image(systemName: "square.dashed")
                    .font(.system(size: 8))
            }
            Button(action: { StealthWindowManager.shared.setStealthMode(.minimal) }) {
                Image(systemName: "textformat")
                    .font(.system(size: 8))
            }
            // Note: DecisionEngine.shared.toggleAutonomyMode() is referenced in the original snippet
            // but we don't have the DecisionEngine implementation here.
        }
        .padding(4)
        .background(Color.black.opacity(0.3))
        .cornerRadius(4)
    }
}

// MARK: - VisualEffectView Helper
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
    
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.blendingMode = blendingMode
    }
}

// MARK: - Data Models
struct StealthContent {
    var transcript: String = ""
    var confidence: Float = 0.0
    var reasoning: [ReasoningStep] = []
    var response: String = ""
    var responseConfidence: Float = 0.0
    var autoCopied: Bool = false
}

struct ReasoningStep {
    let description: String
    let confidence: Float
    let timestamp: Date
}
