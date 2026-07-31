# About Jarvis

**Author:** Gaurav Chakraborty
**Repository:** https://github.com/gaurav-chakraborty/jarvis

## Project Description

Jarvis is designed to be the ultimate companion for technical and behavioral interviews. By combining real-time transcription, intent analysis, and strategic reasoning, it helps candidates stay focused, recall key experiences, and deliver high-quality answers.

The system is built on a "Stealth First" philosophy, ensuring that its assistance remains private and non-intrusive. The native macOS component uses low-level system APIs to capture audio and screen content without triggering standard recording indicators.

## Technology Stack

### Frontend & Core Logic
- **React 18**: For the interactive web dashboard.
- **TypeScript**: Ensuring type safety across the agent architecture.
- **TailwindCSS**: For a clean, modern, and responsive UI.
- **Vite**: Fast development and build tool.
- **WebSocket**: For real-time communication between the web app and native components.

### Native Integration (macOS)
- **Swift**: Leveraging ScreenCaptureKit and CoreAudio for high-performance system integration.
- **OCR**: Real-time text extraction from screen content.

### Backend & Persistence
- **Supabase**: Providing a robust PostgreSQL database, authentication, and real-time capabilities.
- **Vector Caching**: Semantic search for memory recall and knowledge retrieval.

## Key Modules

- **AgentCore**: The central brain that orchestrates intent prediction, memory recall, and response generation.
- **LLMService**: Integration with Google Gemini for high-quality natural language processing.
- **MemoryStore**: A hybrid short-term and long-term memory system.
- **StrategySelector**: Adapts the agent's behavior based on the interview's progress and tone.

## Contributing

Contributions are welcome. Please follow the guidelines in CONTRIBUTING.md.

## License

MIT
