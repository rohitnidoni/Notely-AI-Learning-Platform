# Deploy Notely publicly with Render

This project is configured to serve the built React website and Gemini API from one Node.js web service.

## 1. Push this project to GitHub
- Create a new GitHub repository (Public or Private).
- Upload the contents of this folder (`ai-student-learning-platform`) to the repository root.
- Do not upload `.env`, API keys, `node_modules`, or `dist`. The `.gitignore` excludes `.env`.

## 2. Create the Render service
- Sign in at https://render.com and choose **New → Web Service**.
- Connect the GitHub repository.
- Runtime: **Node**.
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Choose the Free instance if available.

## 3. Add the secret Gemini key
In Render → your service → **Environment**, add:
- Key: `GEMINI_API_KEY`
- Value: your Gemini API key (keep it secret)
Then save and deploy. Do not put the key in React source code or GitHub.

## 4. Share your site
After deployment succeeds, Render provides a public `https://...onrender.com` URL. Send that URL to anyone. The first request after inactivity on a free service may take a little time while it wakes up.

## Notes
- The website and API are served from the same origin, so no separate API URL is required.
- Browser-stored documents and learning history remain local to each visitor's browser; they are not shared between users or synced to a cloud database.
- AI usage is billed/limited according to the Gemini API account and quotas. Keep the API key private and monitor usage.
