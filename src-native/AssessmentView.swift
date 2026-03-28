import SwiftUI

struct AssessmentView: View {
    @State private var extractedText = ""
    @State private var answer = ""
    @State private var explanation = ""
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var ocrItems: [RecognizedText] = []
    @State private var autoSelect = false
    @State private var currentResult: AssessmentResult?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Assessment Helper")
                    .font(.headline)
                Spacer()
                if isProcessing {
                    ProgressView()
                        .scaleEffect(0.7)
                }
            }
            
            Button(action: scanAndAnswer) {
                HStack {
                    Image(systemName: "viewfinder")
                    Text("Scan Screen & Answer")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isProcessing)
            
            Toggle("Auto-select answer", isOn: $autoSelect)
                .font(.caption)
                .padding(.top, 4)
            
            if !extractedText.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Extracted Question:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    ScrollView {
                        Text(extractedText)
                            .font(.system(.body, design: .monospaced))
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.black.opacity(0.1))
                            .cornerRadius(6)
                    }
                    .frame(maxHeight: 100)
                }
            }
            
            if !answer.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Suggested Answer:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(answer)
                        .font(.headline)
                        .foregroundColor(.green)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(6)
                }
            }
            
            if !explanation.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Explanation:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    ScrollView {
                        Text(explanation)
                            .font(.body)
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(6)
                    }
                    .frame(maxHeight: 120)
                }
            }
            
            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(8)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(6)
            }
            
            if !answer.isEmpty && !autoSelect {
                Button("Manually Select Answer") {
                    selectAnswerInUI()
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .frame(width: 400)
        .background(VisualEffectView(material: .hudWindow, blendingMode: .behindWindow))
    }
    
    private func scanAndAnswer() {
        isProcessing = true
        errorMessage = nil
        
        // 1. Capture screen and OCR
        let (text, items) = ScreenOCR.captureAndOCR()
        extractedText = text
        ocrItems = items
        
        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "No text detected on screen. Ensure the question is visible."
            isProcessing = false
            return
        }
        
        // 2. Send to agent via WebSocket
        WebSocketClient.shared.sendAssessment(text: text) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let assessmentResult):
                    answer = assessmentResult.answer
                    explanation = assessmentResult.explanation
                    currentResult = assessmentResult
                    
                    if autoSelect {
                        // Small delay to let user see the answer before clicking
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                            selectAnswerInUI()
                        }
                    }
                case .failure(let error):
                    errorMessage = "Agent Error: \(error.localizedDescription)"
                }
                isProcessing = false
            }
        }
    }
    
    private func selectAnswerInUI() {
        guard let letter = currentResult?.answerLetter else { return }
        
        // Match pattern like "A)", "A.", or just "A" at the start of a line
        let pattern = "^\(letter)[\\.\\)]"
        
        for item in ocrItems {
            if item.text.range(of: pattern, options: .regularExpression) != nil {
                let center = CGPoint(x: item.boundingBox.midX, y: item.boundingBox.midY)
                ClickHelper.clickAtPoint(center)
                return
            }
        }
        
        // Fallback: try matching just the letter if it's a short string
        for item in ocrItems {
            if item.text.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() == letter {
                let center = CGPoint(x: item.boundingBox.midX, y: item.boundingBox.midY)
                ClickHelper.clickAtPoint(center)
                return
            }
        }
        
        errorMessage = "Could not find option '\(letter)' on screen to click."
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
    
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.blendingMode = blendingMode
    }
}
