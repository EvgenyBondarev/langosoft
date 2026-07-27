# LangoSoft — Parallel Text Reader (Blindfold Mode)

Study Dante's Divine Comedy in Italian + English using only your keyboard.

## Setup

### 1. Add your Groq API key

Edit `backend/appsettings.json`:
```json
"Groq": {
  "ApiKey": "gsk_your_key_here",
  "Model": "llama-3.3-70b-versatile"
}
```
Or set environment variable `GROQ_API_KEY=gsk_your_key_here`.

Get a free key at https://console.groq.com

### 2. Start the app

```powershell
.\start.ps1
```

Or manually:
```powershell
# Terminal 1 — backend (downloads texts on first run ~2 MB)
cd backend
dotnet run

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F** | Switch active panel (Italian ↔ English) |
| **8** / Numpad 8 | Read current line aloud |
| **5** / Numpad 5 | Read current word aloud |
| **2** / Numpad 2 | Read current letter aloud |
| **6** / Numpad 6 | Next word |
| **4** / Numpad 4 | Previous word |
| **3** / Numpad 3 | Next letter |
| **1** / Numpad 1 | Previous letter |
| **9** / Numpad 9 | Next line |
| **7** / Numpad 7 | Previous line |
| **A** | Start multi-word selection (then use 4/6 to extend) |
| **D** | Translate current word / selection via Groq |
| **S** | Open question input → 2-sentence Groq answer |
| **Escape** | Cancel selection / close response |

## Workflow Example

1. `F` → switch to English, `8` → hear the line in English
2. `F` → switch to Italian, `8` → hear the same line in Italian
3. `6` `6` → move to 3rd word, `5` → hear just that word
4. `D` → hear translation of that word
5. `A` then `6` `6` → select words 3–5, then `D` → translate the phrase
6. `S` → type *"What case is 'selva'?"* → get a 2-sentence grammar note

## Architecture

```
langosoft/
├── backend/          C# ASP.NET Core 8
│   ├── Services/
│   │   ├── TextService.cs    Downloads & parses PG texts, aligns lines
│   │   └── GroqService.cs    Groq API (translation + Q&A)
│   └── Controllers/
│       ├── TextController.cs  GET /api/text/canto
│       └── AIController.cs    POST /api/ai/translate & /question
└── frontend/         React 18 + TypeScript + Vite
    └── src/
        ├── hooks/
        │   ├── useNavigation.ts  All cursor/selection state
        │   └── useSpeech.ts      Web Speech API wrapper
        ├── components/
        │   ├── TextPanel.tsx     Line/word/letter highlighting
        │   ├── AIModal.tsx       S-key question overlay
        │   └── StatusBar.tsx     Position & shortcuts display
        └── App.tsx               Keyboard handler + orchestration
```

## Text Sources

- **Italian**: Dante Alighieri, *La Divina Commedia* — Project Gutenberg #1000
- **English**: Longfellow translation — Project Gutenberg #1001

Both are public domain. Downloaded once and cached in `backend/Data/`.
