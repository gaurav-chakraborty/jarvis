# Secrets & API Keys Quick Reference

This file contains a list of all required environment variables and secrets for the Jarvis system. **Do not commit your actual keys to version control.**

## Environment Variables (.env)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | [Supabase Dashboard](https://app.supabase.com) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key | [Supabase Dashboard](https://app.supabase.com) |
| `VITE_GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://aistudio.google.com) |
| `WS_PORT` | Port for the WebSocket server (default: 8080) | Local configuration |

## Supabase Configuration

The system expects the following tables in your Supabase database (see `supabase/migrations` for the schema):
- `interviews`: Stores session metadata.
- `conversation_turns`: Stores history of questions and answers.
- `agent_memories`: Stores long-term knowledge and experiences.
- `adaptive_strategies`: Stores different personas and response styles.

## Native App Permissions

The macOS native component requires the following permissions:
- **Screen Recording**: For OCR and screen capture.
- **Microphone**: For audio capture.
- **Accessibility**: For global hotkeys and window management.

---
*Note: This file is for developer reference only. Ensure all keys are stored securely.*
