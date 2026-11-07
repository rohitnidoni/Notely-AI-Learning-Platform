import 'dotenv/config'
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = process.env.PORT || 8787
const MODEL = 'gemini-3.5-flash-lite'
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
}

async function serveFrontend(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  const requested = path.resolve(DIST_DIR, `.${pathname}`)
  let filePath = requested.startsWith(DIST_DIR + path.sep) || requested === path.join(DIST_DIR, 'index.html') ? requested : path.join(DIST_DIR, 'index.html')
  try {
    let stat = await fs.stat(filePath)
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html')
    const body = await fs.readFile(filePath)
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
    res.end(req.method === 'HEAD' ? undefined : body)
    return true
  } catch {
    try {
      const index = await fs.readFile(path.join(DIST_DIR, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      res.end(req.method === 'HEAD' ? undefined : index)
      return true
    } catch {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Notely is starting. Please try again shortly.')
      return true
    }
  }
}

const send = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > 2_000_000) {
        reject(new Error('Request is too large.'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) }
      catch { reject(new Error('Invalid JSON request.')) }
    })
    req.on('error', reject)
  })
}

async function callGemini(prompt, apiKey, jsonMode = false) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonMode ? { temperature: 0.7, responseMimeType: 'application/json' } : { temperature: 0.7 }
      }),
      signal: AbortSignal.timeout(90000)
    }
  )
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Gemini request failed.')
    error.status = response.status
    throw error
  }
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n')
  if (!text) throw new Error('Gemini returned an empty response.')
  return text
}

const server = http.createServer(async (req, res) => {
  console.log('Request:', req.method, req.url)
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, service: 'Notely API' })
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true })
  if (req.method !== 'POST' || !['/api/ask', '/api/generate-quiz', '/api/generate-study-notes', '/api/generate-flashcards'].includes(req.url)) {
    if (req.url.startsWith('/api/')) return send(res, 404, { error: 'Not found' })
    return serveFrontend(req, res)
  }

  try {
    const body = await readBody(req)
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) return send(res, 503, { error: 'Gemini API key is missing. Check the root .env file.' })

    if (req.url === '/api/ask') {
      const { question, context = '' } = body
      if (!question?.trim()) return send(res, 400, { error: 'Please enter a question.' })
      const prompt = `You are Notely, a helpful student study assistant. Answer clearly and accurately in simple language. Use the supplied study notes when relevant. If the notes do not contain the answer, say so and label any general explanation.\n\nSTUDY NOTES:\n${String(context).slice(0, 24000)}\n\nSTUDENT QUESTION:\n${question}`
      const answer = await callGemini(prompt, apiKey)
      let parsed
      try { parsed = JSON.parse(answer) } catch {}
      return send(res, 200, { answer: typeof parsed === 'string' ? parsed : answer })
    }

    if (req.url === '/api/generate-study-notes') {
      const { context = '', title = 'Study material' } = body
      if (!String(context).trim()) return send(res, 400, { error: 'Upload a readable PDF before generating study notes.' })
      const prompt = `You are Notely, an accurate study-notes assistant. Use ONLY the supplied source material. Do not add outside facts. Return ONLY valid JSON with this shape: {"summary":"a clear concise summary","keyPoints":["point"],"definitions":[{"term":"term","meaning":"meaning from source"}],"revisionQuestions":["question"]}. Include 5-10 key points, up to 8 definitions only when explicitly supported, and 5 revision questions. If a section is not supported by the source, return an empty array for it. No markdown fences. Source title: ${String(title).slice(0,160)}\n\nSOURCE MATERIAL:\n${String(context).slice(0,24000)}`
      const raw = await callGemini(prompt, apiKey, true)
      let parsed
      try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()) }
      catch { return send(res, 502, { error: 'The AI returned invalid study-notes format. Please try again.' }) }
      return send(res, 200, { summary: String(parsed.summary || ''), keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter(x => typeof x === 'string').slice(0,12) : [], definitions: Array.isArray(parsed.definitions) ? parsed.definitions.filter(x => x && typeof x.term === 'string' && typeof x.meaning === 'string').slice(0,10) : [], revisionQuestions: Array.isArray(parsed.revisionQuestions) ? parsed.revisionQuestions.filter(x => typeof x === 'string').slice(0,8) : [] })
    }

    if (req.url === '/api/generate-flashcards') {
      const { context = '', count = 10 } = body
      if (!String(context).trim()) return send(res, 400, { error: 'Upload a readable PDF before generating flashcards.' })
      const safeCount = Math.min(20, Math.max(5, Number(count) || 10))
      const prompt = `Create up to ${safeCount} useful study flashcards using ONLY the source material. Return ONLY valid JSON: {"cards":[{"front":"short question or term","back":"accurate answer from source"}]}. Keep answers concise, avoid duplicates, and do not invent facts. No markdown fences.\n\nSOURCE MATERIAL:\n${String(context).slice(0,24000)}`
      const raw = await callGemini(prompt, apiKey, true)
      let parsed
      try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()) }
      catch { return send(res, 502, { error: 'The AI returned invalid flashcard format. Please try again.' }) }
      const cards = Array.isArray(parsed.cards) ? parsed.cards.filter(c => c && typeof c.front === 'string' && c.front.trim() && typeof c.back === 'string' && c.back.trim()).slice(0,safeCount) : []
      if (!cards.length) return send(res, 502, { error: 'No flashcards could be created from this document.' })
      return send(res, 200, { cards })
    }

    if (req.url === '/api/generate-quiz') {
      const { context = '', count = 5, difficulty = 'Medium' } = body
      const safeCount = Math.min(20, Math.max(1, Number(count) || 5))
      if (!String(context).trim()) return send(res, 400, { error: 'Upload a readable PDF before generating a quiz.' })
      const prompt = `Create exactly ${safeCount} multiple-choice quiz questions using ONLY the study material below. Difficulty: ${difficulty}. Do not use outside facts. Return ONLY valid JSON with this exact shape: {"questions":[{"q":"question text","options":["option A","option B","option C","option D"],"answer":0,"why":"short explanation grounded in the notes"}]}. The answer field must be a zero-based integer from 0 to 3. Each question must have exactly four distinct options and exactly one correct answer. Make questions clear, avoid duplicates, and do not include markdown fences. If the notes do not contain enough information for the requested number, return only as many valid questions as the notes support.\n\nSTUDY MATERIAL:\n${String(context).slice(0, 24000)}`
      const raw = await callGemini(prompt, apiKey, true)
      let parsed
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        console.error('Quiz JSON parse failed:', raw.slice(0, 500))
        return send(res, 502, { error: 'The AI returned an invalid quiz format. Please generate again.' })
      }
      const questions = Array.isArray(parsed.questions) ? parsed.questions.filter(item =>
        typeof item.q === 'string' && item.q.trim() &&
        Array.isArray(item.options) && item.options.length === 4 &&
        item.options.every(option => typeof option === 'string' && option.trim()) &&
        Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3
      ).slice(0, safeCount) : []
      if (!questions.length) return send(res, 502, { error: 'No valid questions could be created from this PDF. Try another document.' })
      return send(res, 200, { questions })
    }
  } catch (error) {
    console.error('API request failed:', error)
    const status = error.status || (error.name === 'TimeoutError' ? 504 : 500)
    return send(res, status, { error: error.message || 'Unexpected server error.' })
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`Notely is running on port ${PORT}`))
