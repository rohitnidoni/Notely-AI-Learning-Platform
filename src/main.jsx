import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDownToLine, ArrowUpRight, Bell, BookOpen, Bot, Brain, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, CloudUpload, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, MoreHorizontal, Paperclip, Plus, Search, Send, Settings, ShieldCheck, Sparkles, Sun, Target, Trash2, Trophy, Upload, UserRound, X, Zap } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'
import './style.css'

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const starterChats = [
  { id: 1, title: 'Cranial nerves overview', preview: 'Can you explain the twelve cranial nerves?', time: 'Today' },
  { id: 2, title: 'Difference between RAM and ROM', preview: 'Compare volatile and non-volatile memory.', time: 'Yesterday' },
  { id: 3, title: 'OSI model revision', preview: 'Explain all seven layers with examples.', time: 'Yesterday' }
]
const initialMessages = [
  { role: 'assistant', text: 'Hey Jane! 👋 I’m your AI study assistant. Ask me anything, or attach your notes and I’ll explain concepts using your material.' }
]
const starterQuizQuestions = [
  { q: 'Which layer of the OSI model is responsible for routing packets?', options: ['Data Link', 'Network', 'Transport', 'Session'], answer: 1, why: 'The Network layer handles logical addressing and routing packets between networks.' },
  { q: 'Which data structure follows the LIFO principle?', options: ['Queue', 'Tree', 'Stack', 'Graph'], answer: 2, why: 'A stack follows Last In, First Out (LIFO).' },
  { q: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing User'], answer: 0, why: 'CPU stands for Central Processing Unit.' },
  { q: 'Which protocol is used to securely browse websites?', options: ['FTP', 'HTTP', 'HTTPS', 'SMTP'], answer: 2, why: 'HTTPS uses TLS encryption to secure web communication.' },
  { q: 'Which memory is volatile?', options: ['ROM', 'SSD', 'RAM', 'Flash'], answer: 2, why: 'RAM loses its stored data when power is removed.' }
]
const chartData = [{ day: 'Mon', hours: 1.5 }, { day: 'Tue', hours: 2.2 }, { day: 'Wed', hours: 1.7 }, { day: 'Thu', hours: 3.1 }, { day: 'Fri', hours: 2.4 }, { day: 'Sat', hours: 3.8 }, { day: 'Sun', hours: 2.9 }]
const navItems = [
  ['Overview', LayoutDashboard], ['AI Assistant', Bot], ['My Documents', FileText], ['Quiz & Aptitude', Brain], ['My Progress', Activity]
]
function initials(name='Jane Doe') { return name.split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase() }
function App() {
  const [page, setPage] = useState('Overview')
  const [dark, setDark] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState({ name: 'Jane Doe', email: 'jane.student@example.com', avatar: '' })
  const [session, setSession] = useState(null)
  const [notes, setNotes] = useState([])
  const [chats, setChats] = useState(starterChats)
  const [activeChat, setActiveChat] = useState(1)
  const [messages, setMessages] = useState(initialMessages)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState(starterQuizQuestions)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizCount, setQuizCount] = useState('5')
  const [quizDifficulty, setQuizDifficulty] = useState('Medium')
  const [quizSource, setQuizSource] = useState('all')
  const [generatingQuiz, setGeneratingQuiz] = useState(false)
  const [answers, setAnswers] = useState({})
  const [quizDone, setQuizDone] = useState(false)
  const [results, setResults] = useState([])
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const fileRef = useRef(null)
  const chatEndRef = useRef(null)
  const [chatById, setChatById] = useState({ 1: initialMessages })
  const currentMessages = chatById[activeChat] || initialMessages
  const completedCount = results.length
  const average = completedCount ? Math.round(results.reduce((a,b)=>a+b.score,0)/completedCount) : 0
  const totalQuestions = quizQuestions.length

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setSession(data.session); setUser({ name: data.session.user.user_metadata.full_name || data.session.user.email, email: data.session.user.email, avatar: data.session.user.user_metadata.avatar_url || '' }) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) setUser({ name: s.user.user_metadata.full_name || s.user.email, email: s.user.email, avatar: s.user.user_metadata.avatar_url || '' })
    })
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [currentMessages, page])
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(''), 3200); return () => clearTimeout(t) } }, [notice])

  async function signIn() {
    if (!supabase) { setNotice('Demo mode is active. Add Supabase keys to enable Google sign-in.'); return }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) setNotice(error.message)
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSession(null); setUser({ name: 'Jane Doe', email: 'jane.student@example.com', avatar: '' }); setNotice('Signed out.')
  }
  async function processFile(file) {
    if (!file) return
    if (file.type !== 'application/pdf') { setNotice('Please upload a PDF file.'); return }
    if (file.size > 12 * 1024 * 1024) { setNotice('Please choose a PDF smaller than 12 MB.'); return }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
      let text = ''
      for (let i=1; i<=pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(item => item.str).join(' ') + '\\n'
      }
      const item = { id: Date.now(), name: file.name, size: file.size, pages: pdf.numPages, text, date: new Date().toLocaleDateString() }
      setNotes(prev => [item, ...prev])
      if (supabase && session) {
        const path = `${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
        const { error } = await supabase.storage.from('student-notes').upload(path, file)
        if (error) setNotice(`PDF processed locally; cloud upload: ${error.message}`)
        else setNotice('PDF uploaded and text extracted successfully.')
      } else setNotice('PDF uploaded and text extracted. RAG is ready for questions.')
    } catch (e) { setNotice(`Could not read this PDF: ${e.message}`) }
  }
  function retrieveRelevantText(query) {
    const terms = query.toLowerCase().match(/[a-z0-9]{3,}/g) || []
    const chunks = notes.flatMap(note => {
      const words = note.text.split(/\s+/)
      const parts = []
      for (let i = 0; i < words.length; i += 180) parts.push({ name: note.name, text: words.slice(i, i + 220).join(' ') })
      return parts
    })
    const ranked = chunks.map(chunk => {
      const body = chunk.text.toLowerCase()
      const score = terms.reduce((sum, term) => sum + (body.includes(term) ? 1 : 0), 0)
      return { ...chunk, score }
    }).filter(chunk => chunk.score > 0).sort((a,b) => b.score - a.score).slice(0, 4)
    return ranked.map(chunk => `SOURCE: ${chunk.name}\n${chunk.text}`).join('\n\n')
  }
  async function sendQuestion() {
    const q = question.trim()
    if (!q || busy) return
    const next = [...currentMessages, { role: 'user', text: q }]
    setChatById(prev => ({ ...prev, [activeChat]: next }))
    setQuestion(''); setBusy(true)
    try {
      const context = notes.map(n => `DOCUMENT: ${n.name}\\n${n.text}`).join('\\n\\n').slice(0,24000)
      const response = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, context }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI request failed')
      setChatById(prev => ({ ...prev, [activeChat]: [...(prev[activeChat] || next), { role: 'assistant', text: data.answer }] }))
    } catch (e) {
      const fallback = notes.length
        ? `I have ${notes.length} uploaded document(s), including ${notes[0].name}. To generate a live AI answer, configure your Gemini API key in the server .env file. Your PDF text has been extracted and is ready for note-grounded retrieval.`
        : 'I’m ready to help! Configure your Gemini API key in the server .env file to enable live AI responses. You can also upload a PDF in My Documents so questions can be grounded in your notes.'
      setChatById(prev => ({ ...prev, [activeChat]: [...(prev[activeChat] || next), { role: 'assistant', text: `${fallback}\\n\\nSetup detail: ${e.message}` }] }))
    } finally { setBusy(false) }
  }
  function newChat() {
    const id = Date.now()
    setChats(prev => [{ id, title: 'New conversation', preview: 'Start a new study session', time: 'Now' }, ...prev])
    setChatById(prev => ({ ...prev, [id]: initialMessages }))
    setActiveChat(id); setPage('AI Assistant')
  }
  function removeNote(id) { setNotes(prev => prev.filter(n => n.id !== id)); setNotice('Document removed from this session.') }
  async function generateQuiz() {
    if (!notes.length) { setNotice('Upload a PDF in My Documents before generating a quiz.'); return }
    const selectedNotes = quizSource === 'all' ? notes : notes.filter(n => String(n.id) === quizSource)
    const context = selectedNotes.map(n => `DOCUMENT: ${n.name}\n${n.text}`).join('\n\n').slice(0, 24000)
    if (!context.trim()) { setNotice('No readable text found in the selected PDF.'); return }
    setGeneratingQuiz(true)
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, count: Number(quizCount), difficulty: quizDifficulty })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Quiz generation failed.')
      if (!Array.isArray(data.questions) || data.questions.length < 1) throw new Error('The AI did not return valid questions. Please try again.')
      const normalized = data.questions.map(item => ({
        q: String(item.q || item.question || ''),
        options: Array.isArray(item.options) ? item.options.map(String).slice(0, 4) : [],
        answer: Number(item.answer),
        why: String(item.why || item.explanation || 'Review the relevant section of your uploaded notes.')
      })).filter(item => item.q && item.options.length === 4 && Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4)
      if (!normalized.length) throw new Error('The AI response could not be converted into quiz questions. Try again.')
      setQuizQuestions(normalized)
      setQuizIndex(0); setAnswers({}); setQuizDone(false)
      setNotice(`Generated ${normalized.length} fresh questions from your study material.`)
    } catch (error) {
      setNotice(error.message || 'Unable to generate quiz. Please try again.')
    } finally { setGeneratingQuiz(false) }
  }
  function chooseAnswer(index) { setAnswers(prev => ({ ...prev, [quizIndex]: index })) }
  function finishQuiz() {
    const score = Math.round(quizQuestions.reduce((sum,q,i)=>sum+(answers[i]===q.answer?1:0),0)/totalQuestions*100)
    setResults(prev => [...prev, { score, date: new Date().toLocaleDateString() }]); setQuizDone(true)
  }
  function resetQuiz() { setQuizIndex(0); setAnswers({}); setQuizDone(false) }
  const filteredNotes = notes.filter(n => n.name.toLowerCase().includes(search.toLowerCase()))

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-icon"><GraduationCap size={25}/></div><div><b>Notely</b><small>AI-powered learning</small></div><button className="mobile-close icon-btn" onClick={()=>setMobileNav(false)}><X/></button></div>
      <div className="workspace-label">LEARNING WORKSPACE</div>
      <nav>{navItems.map(([label,Icon])=><button key={label} className={`nav-link ${page===label?'active':''}`} onClick={()=>{setPage(label);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{label==='AI Assistant'&&<span className="nav-new">AI</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-spark"><Sparkles size={18}/></div><b>Learn smarter every day</b><p>Upload your notes and let AI help you understand faster.</p><button onClick={()=>setPage('My Documents')}>Explore notes <ArrowUpRight size={14}/></button></div>
        <button className="nav-link" onClick={()=>setProfileOpen(true)}><Settings size={18}/>Settings</button>
        <button className="nav-link" onClick={signOut}><LogOut size={18}/>Sign out</button>
      </div>
    </aside>
    {mobileNav&&<div className="scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button>
        <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{page}</strong></div>
        <div className="top-actions"><button className="icon-btn" onClick={()=>setNotice('You are all caught up!')}><Bell size={19}/><i className="notification-dot"/></button><button className="theme-toggle" onClick={()=>setDark(!dark)} title="Toggle theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button><button className="profile-chip" onClick={()=>setProfileOpen(!profileOpen)}>{user.avatar?<img src={user.avatar}/>:<span>{initials(user.name)}</span>}<b>{user.name.split(' ')[0]}</b><ChevronDown size={15}/></button></div>
        {profileOpen&&<div className="profile-menu"><b>{user.name}</b><small>{user.email}</small><button onClick={signIn}><ShieldCheck size={15}/> Sign in with Google</button><button onClick={signOut}><LogOut size={15}/> Sign out</button></div>}
      </header>
      <div className="content">
        {page==='Overview'&&<Dashboard user={user} notes={notes} results={results} average={average} setPage={setPage} data={chartData}/>}
        {page==='AI Assistant'&&<section className="chat-layout">
          <div className="chat-sidebar">
            <div className="chat-tabs"><span className="selected"><MessageCircle size={15}/> Chats</span><button onClick={()=>setPage('My Documents')}><FileText size={15}/> Documents</button></div>
            <label className="field-label">Study mode</label><select className="select"><option>Default</option><option>Explain simply</option><option>Exam preparation</option></select>
            <button className="primary full" onClick={newChat}><Plus size={17}/>New chat</button>
            <div className="section-caption">RECENT CHATS</div>
            <div className="chat-list">{chats.map(c=><button key={c.id} className={activeChat===c.id?'chat-history active':'chat-history'} onClick={()=>{setActiveChat(c.id);setChatById(prev=>({...prev,[c.id]:prev[c.id]||initialMessages}))}}><MessageCircle size={16}/><span>{c.title}</span></button>)}</div>
            <div className="attach-area"><button onClick={()=>fileRef.current?.click()}><Paperclip size={16}/> Attach documents</button><small>{notes.length?`${notes.length} document(s) available to this chat`:'No documents attached to this chat'}</small></div>
          </div>
          <div className="chat-main">
            <div className="chat-heading"><div className="bot-avatar"><GraduationCap/></div><div><b>AI Study Assistant</b><small><span className="online-dot"/> Ready to help you learn</small></div><button className="icon-btn" onClick={()=>setNotice('Your study assistant is ready.')}><MoreHorizontal/></button></div>
            <div className="messages">
              {currentMessages.map((m,i)=><div key={i} className={`message-row ${m.role}`}><div className="message-avatar">{m.role==='assistant'?<GraduationCap size={17}/>:initials(user.name)}</div><div className="message-bubble"><div className="message-text">{m.text}</div><div className="message-meta">{m.role==='assistant'?'AI Study Assistant':'You'} · {new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div></div></div>)}
              {busy&&<div className="message-row assistant"><div className="message-avatar"><GraduationCap size={17}/></div><div className="message-bubble typing"><span/><span/><span/></div></div>}
              <div ref={chatEndRef}/>
            </div>
            <div className="composer-wrap"><div className="composer"><button className="icon-btn" onClick={()=>fileRef.current?.click()} title="Attach PDF"><Paperclip size={19}/></button><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendQuestion())} placeholder="Ask a question about your studies..."/><button className="send-btn" onClick={sendQuestion} disabled={busy||!question.trim()}><Send size={18}/></button></div><small>AI can make mistakes. Verify important information with your course material.</small></div>
          </div>
          <input ref={fileRef} hidden type="file" accept="application/pdf" onChange={e=>{processFile(e.target.files?.[0]);e.target.value=''}}/>
        </section>}
        {page==='My Documents'&&<Documents notes={filteredNotes} search={search} setSearch={setSearch} fileRef={fileRef} processFile={processFile} removeNote={removeNote} setPage={setPage}/>}
        {page==='Quiz & Aptitude'&&<Quiz quizQuestions={quizQuestions} notes={notes} quizSource={quizSource} setQuizSource={setQuizSource} quizCount={quizCount} setQuizCount={setQuizCount} quizDifficulty={quizDifficulty} setQuizDifficulty={setQuizDifficulty} generatingQuiz={generatingQuiz} generateQuiz={generateQuiz} quizIndex={quizIndex} setQuizIndex={setQuizIndex} answers={answers} chooseAnswer={chooseAnswer} quizDone={quizDone} finishQuiz={finishQuiz} resetQuiz={resetQuiz} results={results}/>}
        {page==='My Progress'&&<Progress results={results} average={average} notes={notes} data={chartData}/>}
      </div>
    </main>
    {notice&&<div className="toast"><Check size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
  </div>
}
function PageHeading({eyebrow,title,subtitle,action}) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div> }
function Dashboard({user,notes,results,average,setPage,data}) {
  return <><PageHeading eyebrow="YOUR LEARNING SPACE" title={`Good morning, ${user.name.split(' ')[0]} 👋`} subtitle="Ready to make progress? Here's your learning overview." action={<button className="primary" onClick={()=>setPage('AI Assistant')}><Sparkles size={16}/>Ask AI assistant</button>}/>
    <div className="stat-grid">
      <Stat icon={BookOpen} label="Documents uploaded" value={notes.length} change="Your personal library" tone="violet"/>
      <Stat icon={Clock3} label="Study sessions" value={results.length+7} change="Keep your streak going" tone="blue"/>
      <Stat icon={Trophy} label="Quiz average" value={`${average}%`} change={results.length?'Based on your attempts':'Take your first quiz'} tone="pink"/>
      <Stat icon={Target} label="Quizzes completed" value={results.length} change="Practice makes progress" tone="mint"/>
    </div>
    <div className="dashboard-grid">
      <div className="panel chart-panel"><div className="panel-head"><div><h3>Study activity</h3><p>Your learning hours this week</p></div><span className="soft-pill">This week <ChevronDown size={13}/></span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8870e8" stopOpacity={0.22}/><stop offset="95%" stopColor="#8870e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#ecebf2"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#9291a0',fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#9291a0',fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="hours" stroke="#8066df" strokeWidth={3} fill="url(#studyFill)"/></AreaChart></ResponsiveContainer></div></div>
      <div className="panel focus-panel"><div className="panel-head"><div><h3>Weekly focus</h3><p>Your consistency snapshot</p></div><div className="focus-icon"><Zap size={19}/></div></div><div className="focus-number">72<span>%</span></div><div className="progress-track"><i style={{width:'72%'}}/></div><p className="muted">You're building a great learning habit. Keep showing up!</p><div className="focus-footer"><span><span className="green-dot"/> On track</span><b>+12% this week</b></div></div>
      <div className="panel quick-panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Jump back into learning</p></div></div><div className="quick-actions"><button onClick={()=>setPage('AI Assistant')}><span className="quick-icon lavender"><Bot/></span><span><b>Ask AI assistant</b><small>Get instant explanations</small></span><ArrowUpRight/></button><button onClick={()=>setPage('My Documents')}><span className="quick-icon blue-bg"><Upload/></span><span><b>Upload study notes</b><small>Build your knowledge library</small></span><ArrowUpRight/></button><button onClick={()=>setPage('Quiz & Aptitude')}><span className="quick-icon pink-bg"><Brain/></span><span><b>Take a quick quiz</b><small>Test what you've learned</small></span><ArrowUpRight/></button></div></div>
      <div className="panel recent-panel"><div className="panel-head"><div><h3>Recent activity</h3><p>Your latest learning updates</p></div><button className="text-button" onClick={()=>setPage('My Progress')}>View all</button></div>{notes.length||results.length?<div className="activity-list">{notes.slice(0,2).map(n=><div className="activity-item" key={n.id}><span className="activity-icon"><FileText/></span><span><b>{n.name}</b><small>Document uploaded · {n.date}</small></span><Check className="activity-check"/></div>)}{results.slice(-2).map((r,i)=><div className="activity-item" key={i}><span className="activity-icon pink-bg"><Trophy/></span><span><b>Quiz completed</b><small>Score: {r.score}% · {r.date}</small></span><Check className="activity-check"/></div>)}</div>:<div className="empty-activity"><Sparkles/><b>Your learning journey starts here</b><span>Upload a document, ask a question or take a quiz.</span></div>}</div>
    </div>
  </>
}
function Stat({icon:Icon,label,value,change,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-change">{change}</div></div> }
function Documents({notes,search,setSearch,fileRef,processFile,removeNote,setPage}) {
  return <><PageHeading eyebrow="YOUR KNOWLEDGE LIBRARY" title="My documents" subtitle="Keep your study materials organized and ready for AI-powered learning." action={<button className="primary" onClick={()=>fileRef.current?.click()}><Upload size={16}/>Upload PDF</button>}/>
    <div className="document-layout"><div className="panel document-list"><div className="panel-head"><div><h3>Your documents <span className="count-badge">{notes.length}</span></h3><p>Files you've added to your library</p></div><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents"/></div></div>{notes.length?<div className="file-list">{notes.map(n=><div className="file-row" key={n.id}><div className="pdf-icon"><FileText/></div><div className="file-info"><b>{n.name}</b><small>{n.pages} pages · {(n.size/1024/1024).toFixed(2)} MB · {n.date}</small></div><span className="file-type">PDF</span><button className="icon-btn danger-hover" onClick={()=>removeNote(n.id)} title="Remove"><Trash2 size={16}/></button></div>)}</div>:<div className="empty-docs"><div className="empty-icon"><FileText/></div><b>No documents yet</b><p>Upload your lecture notes or study materials to get started.</p><button className="primary" onClick={()=>fileRef.current?.click()}><Upload size={16}/>Choose a PDF</button></div>}</div>
      <div className="panel upload-panel"><div className="upload-title"><div className="upload-illustration"><CloudUpload size={30}/></div><h3>Upload your materials</h3><p>Add PDFs of lecture slides, research papers or study notes. Your AI assistant can use their content to answer questions.</p></div><button className="drop-zone" onClick={()=>fileRef.current?.click()}><div className="cloud-circle"><CloudUpload size={28}/></div><b>Drag and drop your PDF here</b><span>or <strong>browse files</strong></span><small>PDF files only · Maximum 12 MB</small></button><div className="privacy-note"><ShieldCheck size={15}/> Your documents are used only for your study session in demo mode.</div><input ref={fileRef} hidden type="file" accept="application/pdf" onChange={e=>{processFile(e.target.files?.[0]);e.target.value=''}}/></div></div>
    <div className="tip-banner"><Sparkles/><span><b>Study tip:</b> Upload your class notes, then open the AI Assistant and ask it to summarize a chapter or create practice questions.</span><button onClick={()=>setPage('AI Assistant')}>Try it <ArrowUpRight size={14}/></button></div>
  </>
}
function Quiz({quizQuestions,notes,quizSource,setQuizSource,quizCount,setQuizCount,quizDifficulty,setQuizDifficulty,generatingQuiz,generateQuiz,quizIndex,setQuizIndex,answers,chooseAnswer,quizDone,finishQuiz,resetQuiz,results}) {
  const q = quizQuestions[quizIndex]
  const score = quizQuestions.reduce((sum,item,i)=>sum+(answers[i]===item.answer?1:0),0)
  const percent = quizQuestions.length ? Math.round(score/quizQuestions.length*100) : 0
  if (quizDone) return <div className="quiz-wrap"><div className="panel result-card"><div className="result-trophy"><Trophy size={32}/></div><div className="eyebrow">QUIZ COMPLETED</div><h1>Great effort!</h1><p>You've completed your {quizQuestions.length}-question practice quiz.</p><div className="result-score">{percent}<span>%</span></div><div className="result-caption">{score} out of {quizQuestions.length} answers correct</div><div className="result-track"><i style={{width:`${percent}%`}}/></div><div className="answer-review">{quizQuestions.map((item,i)=><div className="review-row" key={i}><span className={answers[i]===item.answer?'correct':'incorrect'}>{answers[i]===item.answer?<Check/>:<X/>}</span><div><b>Question {i+1}</b><p>{item.why}</p></div></div>)}</div><button className="primary" onClick={resetQuiz}>Try again <ArrowUpRight size={16}/></button></div></div>
  return <><PageHeading eyebrow="TEST YOUR KNOWLEDGE" title="Quiz & aptitude" subtitle="Generate fresh practice questions from your uploaded study materials." action={<span className="soft-pill"><Clock3 size={14}/> Self-paced</span>}/>
    <div className="panel" style={{maxWidth:900,margin:'0 auto 22px',padding:22}}>
      <div className="panel-head"><div><h3><Sparkles size={17} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/>AI Quiz Generator</h3><p>Choose a PDF and create a new quiz using its extracted text.</p></div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,alignItems:'end'}}>
        <label className="field-label">Study document<select className="select" value={quizSource} onChange={e=>setQuizSource(e.target.value)} style={{display:'block',width:'100%',marginTop:7}}><option value="all">All uploaded documents</option>{notes.map(note=><option key={note.id} value={String(note.id)}>{note.name}</option>)}</select></label>
        <label className="field-label">Questions<select className="select" value={quizCount} onChange={e=>setQuizCount(e.target.value)} style={{display:'block',width:'100%',marginTop:7}}><option value="5">5 questions</option><option value="10">10 questions</option><option value="20">20 questions</option></select></label>
        <label className="field-label">Difficulty<select className="select" value={quizDifficulty} onChange={e=>setQuizDifficulty(e.target.value)} style={{display:'block',width:'100%',marginTop:7}}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
        <button className="primary" onClick={generateQuiz} disabled={generatingQuiz||!notes.length} style={{minHeight:44,justifyContent:'center'}}>{generatingQuiz?<><span className="spinner"/>Generating...</>:<><Sparkles size={16}/>Generate new quiz</>}</button>
      </div>
      {!notes.length&&<p className="muted" style={{marginTop:12}}>Upload a PDF in My Documents first. Then return here to generate a quiz from it.</p>}
    </div>
    <div className="quiz-wrap"><div className="panel quiz-card"><div className="quiz-top"><div><span className="eyebrow">{quizQuestions===starterQuizQuestions?'FUNDAMENTALS · SAMPLE':'AI-GENERATED · PRACTICE'}</span><h2>Knowledge check</h2></div><div className="question-count">Question <b>{quizIndex+1}</b> of {quizQuestions.length}</div></div><div className="quiz-progress">{quizQuestions.map((_,i)=><i key={i} className={i<quizIndex?'done':i===quizIndex?'current':''}/>)}</div><h3 className="question-text">{q.q}</h3><div className="options">{q.options.map((option,i)=><button key={i} className={`option ${answers[quizIndex]===i?'chosen':''}`} onClick={()=>chooseAnswer(i)}><span className="option-letter">{String.fromCharCode(65+i)}</span>{option}{answers[quizIndex]===i&&<Check className="option-check"/>}</button>)}</div><div className="quiz-footer"><button className="secondary" disabled={quizIndex===0} onClick={()=>setQuizIndex(i=>i-1)}>Previous</button>{quizIndex<quizQuestions.length-1?<button className="primary" disabled={answers[quizIndex]===undefined} onClick={()=>setQuizIndex(i=>i+1)}>Next question <ArrowUpRight size={15}/></button>:<button className="primary" disabled={Object.keys(answers).length!==quizQuestions.length} onClick={finishQuiz}>Submit quiz <Check size={15}/></button>}</div></div><div className="quiz-side"><div className="panel"><div className="quiz-side-icon"><Brain/></div><h3>Practice makes progress</h3><p>Answer each question to the best of your ability. You’ll see explanations and your score when you finish.</p><div className="quiz-side-stat"><span>Questions</span><b>{quizQuestions.length}</b></div><div className="quiz-side-stat"><span>Answered</span><b>{Object.keys(answers).length}/{quizQuestions.length}</b></div><div className="quiz-side-stat"><span>Past attempts</span><b>{results.length}</b></div></div></div></div></>
}
function Progress({results,average,notes,data}) {
  return <><PageHeading eyebrow="YOUR GROWTH" title="Learning progress" subtitle="See your consistency, practice results and learning milestones."/><div className="stat-grid"><Stat icon={Trophy} label="Average quiz score" value={`${average}%`} change="Across completed attempts" tone="violet"/><Stat icon={Target} label="Quizzes completed" value={results.length} change="Keep practicing" tone="blue"/><Stat icon={FileText} label="Study documents" value={notes.length} change="In your library" tone="pink"/><Stat icon={Activity} label="Learning consistency" value="72%" change="Weekly activity estimate" tone="mint"/></div><div className="progress-grid"><div className="panel chart-panel"><div className="panel-head"><div><h3>Weekly study activity</h3><p>Estimated study hours by day</p></div></div><div className="chart tall"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8870e8" stopOpacity={.22}/><stop offset="95%" stopColor="#8870e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#ecebf2"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Area dataKey="hours" type="monotone" stroke="#8066df" strokeWidth={3} fill="url(#progressFill)"/></AreaChart></ResponsiveContainer></div></div><div className="panel milestones"><h3>Learning milestones</h3><p className="muted">Small steps add up to big progress.</p>{[['Upload your first document',notes.length>0],['Complete your first quiz',results.length>0],['Reach 80% quiz average',average>=80],['Build a 5-document library',notes.length>=5]].map(([label,done])=><div className="milestone" key={label}><span className={done?'milestone-check done':'milestone-check'}>{done?<Check size={14}/>:<Target size={14}/>}</span><b>{label}</b><small>{done?'Completed':'In progress'}</small></div>)}</div></div><div className="panel attempts"><div className="panel-head"><div><h3>Quiz history</h3><p>Your recent attempts</p></div></div>{results.length?results.slice().reverse().map((r,i)=><div className="attempt-row" key={i}><span className="activity-icon pink-bg"><Trophy/></span><b>Practice quiz</b><span>{r.date}</span><strong>{r.score}%</strong></div>):<div className="empty-activity"><Brain/><b>No quiz attempts yet</b><span>Complete a quiz to see your results here.</span></div>}</div></>
}
createRoot(document.getElementById('root')).render(<App />)
