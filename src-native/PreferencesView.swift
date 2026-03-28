import SwiftUI

struct PreferencesView: View {
    @AppStorage("geminiApiKey") private var geminiApiKey = ""
    @AppStorage("openAiApiKey") private var openAiApiKey = ""
    @AppStorage("fastModel") private var fastModel = "gemini-1.5-flash"
    @AppStorage("premiumModel") private var premiumModel = "gemini-1.5-pro"
    @AppStorage("complexityThreshold") private var complexityThreshold = 0.65
    @AppStorage("responseStyle") private var responseStyle = "auto"
    @AppStorage("autonomyLevel") private var autonomyLevel = 0.7
    @AppStorage("confidenceThreshold") private var confidenceThreshold = 0.75
    
    let models = [
        "gemini-1.5-flash", "gemini-1.5-pro",
        "gpt-4o-mini", "gpt-4o",
        "claude-3-haiku", "claude-3-sonnet", "claude-3-opus"
    ]
    
    let styles = ["auto", "bullet", "table", "code", "star", "concise", "detailed"]
    
    var body: some View {
        TabView {
            // API Keys Tab
            Form {
                Section(header: Text("API Configuration")) {
                    SecureField("Gemini API Key", text: $geminiApiKey)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    SecureField("OpenAI API Key", text: $openAiApiKey)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Text("Get keys from: https://aistudio.google.com & https://platform.openai.com")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .tabItem {
                Label("API Keys", systemImage: "key")
            }
            
            // Model Routing Tab
            Form {
                Section(header: Text("Intelligent Routing")) {
                    Picker("Fast Model", selection: $fastModel) {
                        ForEach(models, id: \.self) { model in
                            Text(model).tag(model)
                        }
                    }
                    Picker("Premium Model", selection: $premiumModel) {
                        ForEach(models, id: \.self) { model in
                            Text(model).tag(model)
                        }
                    }
                    
                    VStack(alignment: .leading) {
                        HStack {
                            Text("Complexity Threshold")
                            Spacer()
                            Text("\(complexityThreshold, specifier: "%.2f")")
                                .monospacedDigit()
                                .foregroundColor(.blue)
                        }
                        Slider(value: $complexityThreshold, in: 0.3...0.9, step: 0.05)
                        
                        Text("Questions with complexity > threshold use the premium model.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
            .padding()
            .tabItem {
                Label("Model Routing", systemImage: "cpu")
            }
            
            // Response Style Tab
            Form {
                Section(header: Text("Answer Formatting")) {
                    Picker("Preferred Style", selection: $responseStyle) {
                        ForEach(styles, id: \.self) { style in
                            Text(style.capitalized).tag(style)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Style Description")
                            .font(.headline)
                        
                        Text(styleDescription)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .frame(minHeight: 40)
                    }
                    .padding(.top)
                }
            }
            .padding()
            .tabItem {
                Label("Response Style", systemImage: "textformat")
            }
            
            // Autonomy Tab
            Form {
                Section(header: Text("Agent Autonomy")) {
                    VStack(alignment: .leading) {
                        HStack {
                            Text("Autonomy Level")
                            Spacer()
                            Text("\(autonomyLevel, specifier: "%.1f")")
                                .monospacedDigit()
                                .foregroundColor(.blue)
                        }
                        Slider(value: $autonomyLevel, in: 0...1, step: 0.1)
                    }
                    
                    VStack(alignment: .leading) {
                        HStack {
                            Text("Confidence Threshold")
                            Spacer()
                            Text("\(confidenceThreshold, specifier: "%.2f")")
                                .monospacedDigit()
                                .foregroundColor(.blue)
                        }
                        Slider(value: $confidenceThreshold, in: 0.5...0.95, step: 0.05)
                    }
                    
                    Text("Higher autonomy allows the agent to take more actions automatically when confidence is high.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .tabItem {
                Label("Autonomy", systemImage: "bolt")
            }
        }
        .frame(width: 550, height: 450)
    }
    
    private var styleDescription: String {
        switch responseStyle {
        case "bullet": return "Answers are formatted as clear, concise bullet points for quick reading."
        case "table": return "Answers are presented in a structured markdown table comparing different aspects."
        case "code": return "Includes relevant code snippets with syntax highlighting and brief explanations."
        case "star": return "Uses the STAR method (Situation, Task, Action, Result) for behavioral questions."
        case "concise": return "Provides direct, short answers designed to be read in under 30 seconds."
        case "detailed": return "Comprehensive answers including examples, trade-offs, and deeper insights."
        default: return "Automatically selects the best format based on the question type (e.g., STAR for behavioral, Code for technical)."
        }
    }
}

struct PreferencesView_Previews: PreviewProvider {
    static var previews: some View {
        PreferencesView()
    }
}
