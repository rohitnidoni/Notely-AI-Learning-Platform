# Notely — AI-Powered Student Learning Platform

A responsive React + Vite MVP based on the supplied design references.

## Included
- Overview dashboard with learning stats and study-activity chart
- AI Assistant chat UI with chat history
- PDF upload and in-browser text extraction using PDF.js
- Note-grounded question context sent to a server-side Gemini endpoint
- Quiz & aptitude module with scoring and explanations
- Progress page and quiz history
- Responsive layout and light/dark theme
- Optional Supabase Google OAuth and Storage integration

## Requirements
- Node.js 20+ recommended
- npm
- Google AI Studio Gemini API key for live AI answers
- Supabase project for Google sign-in and cloud file storage (optional for local demo)

## Run locally
1. Extract this ZIP.
2. Open the extracted folder in VS Code.
3. In the VS Code terminal run:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env`.
5. Add your Gemini key to `GEMINI_API_KEY` (server-only).
6. Optional: add Supabase URL and anon key to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
7. Start the frontend and API:
   ```bash
   npm run dev
   ```
8. Open http://localhost:5173

## Supabase setup (optional)
1. Create a Supabase project.
2. In Authentication > Providers, enable Google and configure the OAuth client in Google Cloud Console.
3. Add `http://localhost:5173` as a redirect URL in Supabase Auth URL configuration.
4. Create a Storage bucket named `student-notes` and set it to private.
5. Add suitable Storage policies so authenticated users can upload/read only within their own `{user.id}/` folder.
6. Put the project URL and anon key in `.env`.

For a college demo, local demo mode works without Supabase. The app displays a clear message when Google sign-in is not configured.

## Gemini API
Get a key from https://aistudio.google.com/app/apikey and place it in `.env` as:
```env
GEMINI_API_KEY=your_key_here
```
Never use a `VITE_` prefix for the Gemini key. It must stay server-side.
The server endpoint is `POST /api/ask`.

## Important MVP limitations
- In demo mode, uploaded PDF text is held in browser memory for the current session; it is not persisted after refresh.
- The first RAG implementation extracts PDF text, passes available document context to Gemini, and asks the model to ground its response in that context. It is a lightweight context-grounded prototype, not a production vector database.
- Supabase Storage upload is enabled when configured, but the notes metadata list is currently session-local.
- Google OAuth requires correct Supabase and Google Cloud configuration.
- For production deployment, host the API server separately (or convert it to a serverless function) and configure CORS, environment variables, and storage access policies.

## Build
```bash
npm run build
```

## Expanded learning features

- **AI Study Notes:** generates a source-grounded summary, key points, definitions and revision questions from extracted PDF text.
- **AI Flashcards:** creates question-and-answer revision cards from uploaded PDF text.
- **Aptitude Practice:** includes a short quantitative, reasoning and verbal practice set with explanations and score tracking.
- **Browser persistence:** uploaded PDF text (up to 180,000 characters per document), generated study notes, flashcards and quiz results are saved in this browser's local storage. Data is local to this browser/device and is not a cloud backup. Clearing browser site data removes it.
- **Dashboard honesty:** quiz averages and attempt counts use real saved quiz results. Study-time tracking is not currently measured; the dashboard indicates this rather than showing fabricated hours.

### API endpoints

- `POST /api/ask` — AI study assistant
- `POST /api/generate-quiz` — document-based quiz generation
- `POST /api/generate-study-notes` — source-grounded study notes
- `POST /api/generate-flashcards` — source-grounded flashcards
