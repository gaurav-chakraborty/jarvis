# 🎙️ Jarvis: The Ultimate AI Interview Assistant

Jarvis is a high-performance, stealthy macOS application designed to provide real-time assistance during technical and behavioral interviews. It combines advanced LLM routing, native Swift overlays, and offline reliability to ensure you're always prepared.

## 🚀 Key Features

### 🧠 Intelligent Core
- **Dual-Model Routing**: Automatically classifies question complexity to route simple queries to fast models (Gemini Flash) and complex ones to premium models (Gemini Pro).
- **Speculative Pre-fetching**: Predicts likely follow-up questions and generates answers in the background for **0ms latency** responses.
- **Vector-based Semantic Cache**: Uses local embeddings to recognize and instantly answer rephrased questions.
- **Multi-tiered Context Pruning**: Maintains stable latency by intelligently managing conversation memory.

### 🕵️ Stealth & UI
- **Native Swift Overlay**: A high-performance, transparent window that stays on top but remains invisible to screen-sharing software (Zoom, Slack, Teams).
- **Screen Sharing Auto-Peek**: Automatically hides or switches to minimalist mode when screen sharing is detected.
- **Mouse-Away Auto-Hide**: Instantly hides the overlay when the mouse leaves the window area.
- **Streaming Responses**: Tokens stream in real-time via WebSocket IPC for a natural, fast-paced experience.

### 🛡️ Reliability & Security
- **Offline Mode**: Toggle a dedicated offline mode to route all queries to a local **Ollama (Phi-3-mini)** instance for maximum privacy and zero network dependency.
- **API Resilience**: Built-in retry logic with exponential backoff and request deduplication.
- **Secure Storage**: API keys are stored in the macOS Keychain using `node-keytar`.
- **Health Monitoring**: Background monitoring and self-healing for the audio and LLM engines.

### 📝 Timed Assessment Helper
- **Screen OCR**: Captures and extracts text from any region of the screen using macOS Vision framework.
- **Question Parsing**: Automatically identifies MCQs, True/False, and Coding questions.
- **Auto-Selection**: Physically simulates a mouse click on the correct answer in the UI, bypassing right-click restrictions.
- **Explanation Layer**: Provides a detailed reasoning for every suggested answer to help you learn.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **macOS**: 12.0 or later.
- **Node.js**: 18.0 or later.
- **Ollama**: (Optional, for Offline Mode) [Download here](https://ollama.com/).
  ```bash
  # Install Ollama if you haven't already
  curl -fsSL https://ollama.com/install.sh | sh

  # Pull a small, fast model for offline use
  ollama pull phi3:mini
  ```

### 2. Clone & Install
```bash
git clone https://github.com/gaurav-chakraborty/jarvis.git
cd jarvis
npm install
```

### 3. Build Native Components
This step compiles the Swift code for the native macOS overlay.
```bash
npm run build:native
```

### 4. Configuration
Launch the app and open **Preferences** (`Cmd + ,`) to:
- Enter your **Gemini** or **OpenAI** API keys.
- Configure model routing thresholds.
- Select your preferred **Response Style** (STAR, Bullet, Table, etc.).
- Enable **Offline Mode** if you want to run entirely without an internet connection.

---

## 📖 Admin & Usage Manual

### **Operating Modes**
- **Transparent**: Default mode for maximum readability without obstructing your view.
- **Edge-Only**: A minimalist pulsing indicator on the edge of your screen for a low visual footprint.
- **Peek**: The overlay remains invisible by default, appearing only when a new response is generated.

### **Keyboard Shortcuts**
- `Cmd + Shift + J`: Toggle Overlay Visibility.
- `Cmd + Shift + A`: Toggle Assessment Helper Mode.
- `Cmd + ,`: Open Preferences.
- `Cmd + K`: Clear current conversation context and memory.

### **Troubleshooting**
- **No Audio Input**: Ensure "Microphone" and "Accessibility" permissions are granted in `System Settings > Privacy & Security`.
- **High Latency**: If online, check your internet connection. If offline, ensure the Ollama application is running. For consistent low latency, enable **Offline Mode** in Preferences.
- **Overlay Visible in Screen Share**: Ensure the "Stealth Mode" is active in Preferences. The app uses advanced `NSPanel` levels to stay above the standard window capture layer used by most screen-sharing software.

---

## 📄 License
Private Repository - All Rights Reserved.
Developed by **Gaurav Chakraborty**.
