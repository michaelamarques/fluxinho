import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FluxinhoEngine } from '../lib/engine'

export default function Home() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [energy, setEnergy] = useState('medium')
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [tab, setTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [journalText, setJournalText] = useState('')
  const [journalMood, setJournalMood] = useState(null)
  const [journals, setJournals] = useState([])
  const [goals, setGoals] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newTaskType, setNewTaskType] = useState('operacional')
  const [focusTask, setFocusTask] = useState(null)
  const [pomodoroRunning, setPomodoroRunning] = useState(false)
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60)
  const [pomodoroPhase, setPomodoroPhase] = useState('work')
  const [toast, setToast] = useState(null)
  const [suggestion, setSuggestion] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user)
        loadData(data.session.user.id)
      }
      setLoading(false)
    })
  }, [])

  // Pomodoro
  useEffect(() => {
    let interval
    if (pomodoroRunning) {
      interval = setInterval(() => {
        setPomodoroSeconds((s) => {
          if (s <= 1) {
            setPomodoroRunning(false)
            if (pomodoroPhase === 'work') {
              setPomodoroPhase('break')
              setPomodoroSeconds(5 * 60)
              showToast('Pausa! Respira 🌿')
            } else {
              setPomodoroPhase('work')
              setPomodoroSeconds(25 * 60)
              showToast('Foco! Você consegue 🔥')
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [pomodoroRunning, pomodoroPhase])

  const loadData = async (uid) => {
    const { data: taskData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (taskData) setTasks(taskData)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
    if (profileData) {
      setXp(profileData.xp || 0)
      setStreak(profileData.streak || 0)
      setEnergy(profileData.energy || 'medium')
    }

    const { data: journalData } = await supabase
      .from('journal')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(10)
    if (journalData) setJournals(journalData)

    const { data: goalData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', uid)
    if (goalData) setGoals(goalData)
  }

  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const { data: d2 } = await supabase.auth.signUp({ email, password })
      if (d2.user) {
        await supabase.from('profiles').upsert({ id: d2.user.id, xp: 0, streak: 0, energy: 'medium' })
        setUser(d2.user)
        showToast('Bem-vinda ao Fluxinho 🌸')
      }
    } else {
      setUser(data.user)
      loadData(data.user.id)
      showToast('Bem-vinda de volta 🌊')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setTasks([])
  }

  const addTask = async () => {
    if (!newTask.trim()) return
    const task = {
      user_id: user.id,
      title: newTask,
      type: newTaskType,
      urgent: false,
      important: true,
      due_today: true,
      done: false,
      xp_value: 15,
    }
    const { data } = await supabase.from('tasks').insert(task).select()
    if (data) {
      setTasks((t) => [data[0], ...t])
      setNewTask('')
      showToast('Tarefa adicionada ✨')
    }
  }

  const toggleTask = async (task) => {
    const done = !task.done
    await supabase.from('tasks').update({ done }).eq('id', task.id)
    setTasks((ts) => ts.map((t) => t.id === task.id ? { ...t, done } : t))
    if (done) {
      const earned = FluxinhoEngine.xpForTask(task)
      const newXp = xp + earned
      setXp(newXp)
      await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id)
      showToast(`+${earned} XP 🌸`)
    }
  }

  const saveJournal = async () => {
    if (!journalMood) return
    const entry = { user_id: user.id, text: journalText, mood: journalMood }
    const { data } = await supabase.from('journal').insert(entry).select()
    if (data) {
      setJournals((j) => [data[0], ...j])
      setJournalText('')
      setJournalMood(null)
      setXp((x) => x + 5)
      showToast('+5 XP pelo registro 💜')
    }
  }

  const organizeFlow = () => {
    const s = FluxinhoEngine.suggestNext(tasks, energy)
    setSuggestion(s)
    showToast('Fluxo organizado ✨')
  }

  const topTasks = FluxinhoEngine.organizeDay(tasks, energy)
  const level = FluxinhoEngine.levelFromXP(xp)
  const xpProgress = FluxinhoEngine.xpProgress(xp)
  const energyLabel = FluxinhoEngine.energyMap[energy]?.label

  const mins = Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0')
  const secs = (pomodoroSeconds % 60).toString().padStart(2, '0')

  const moods = [
    { key: 'great', emoji: '🌟', label: 'Ótimo' },
    { key: 'good', emoji: '😊', label: 'Bem' },
    { key: 'okay', emoji: '😐', label: 'Ok' },
    { key: 'tired', emoji: '😴', label: 'Cansada' },
    { key: 'sad', emoji: '💜', label: 'Triste' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 48 }}>🌊</div>
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF6F0, #F7C6D044, #D9C7F344)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>🌊</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#5A4A52', marginBottom: 4 }}>Fluxinho</div>
      <div style={{ fontSize: 14, color: '#8A7A82', marginBottom: 40 }}>Seu dia em pequenos fluxos</div>
      <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(180,150,180,0.15)' }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" type="email"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1.5px solid #EAE4E1', fontSize: 15, color: '#5A4A52', fontFamily: 'inherit', outline: 'none', marginBottom: 12, boxSizing: 'border-box', background: '#FFF6F0' }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type="password"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1.5px solid #EAE4E1', fontSize: 15, color: '#5A4A52', fontFamily: 'inherit', outline: 'none', marginBottom: 20, boxSizing: 'border-box', background: '#FFF6F0' }} />
        <button onClick={login} style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #F7C6D0, #D9C7F3)', color: '#5A4A52', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
          Entrar no fluxo ✨
        </button>
        <div style={{ fontSize: 12, color: '#8A7A82', textAlign: 'center', marginTop: 12 }}>Se não tiver conta, cria automaticamente 🌸</div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#FFF6F0', minHeight: '100vh', fontFamily: 'Inter, SF Pro Display, system-ui, sans-serif', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: '52px 20px 0', background: '#FFF6F0', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#5A4A52' }}>Fluxinho 🌊</div>
            <div style={{ fontSize: 12, color: '#8A7A82' }}>Nível {level} · {xp
