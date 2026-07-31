# Jarvis AI Agent

Jarvis is a sophisticated, dual-platform (Web + Native macOS) AI agent system designed to assist during job interviews. It leverages advanced LLMs, real-time audio/screen capture, and long-term memory to provide tactical advice, suggested answers, and strategic guidance.

## Features

- **Real-time Intent Prediction**: Analyzes interviewer questions to categorize them (technical, behavioral, motivational, etc.).
- **Strategic Guidance**: Suggests the best approach for each question based on the interview stage and interviewer profile.
- **Stealth Mode (macOS)**: Native integration for audio capture and OCR that remains hidden from screen sharing and recording tools.
- **Long-term Memory**: Recalls previous interactions and personal knowledge to provide consistent and personalized answers.
- **Multi-Agent Architecture**: Uses specialized agents for intent prediction, strategy, memory, and orchestration.
- **Cross-Platform**: React-based web interface for interaction and Swift-based native app for system-level integration.

## Installation

### Web Application
```bash
git clone https://github.com/gaurav-chakraborty/jarvis.git
cd jarvis
npm install
npm run dev
```

### Native macOS App
```bash
cd src-native
./build.sh
open /Applications/Jarvis.app
```

## Usage

1. Start the Supabase backend and configure environment variables.
2. Launch the web interface to set up your interview context.
3. (Optional) Launch the native app for stealth audio/screen capture.
4. During the interview, Jarvis will listen, analyze questions, and provide suggested answers in real-time.

## Documentation

- [File Index](./FILE_INDEX.md) — Complete directory structure
- [Changelog](./CHANGELOG.md) — Version history
- [About](./ABOUT.md) — Project details
- [Secrets Reference](./QUICK_REFERENCE.md) — API keys and configuration

## License

MIT
