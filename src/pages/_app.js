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
            <div style={{ fontSize: 12, color: '#8A7A82' }}>Nível {level} · {xp} XP · 🔥 {streak} dias</div>
          </div>
          <button onClick={logout} style={{ background: '#EAE4E1', border: 'none', borderRadius: 99, padding: '6px 14px', fontSize: 12, color: '#8A7A82', cursor: 'pointer', fontFamily: 'inherit' }}>Sair</button>
        </div>
        <div style={{ height: 6, background: '#EAE4E1', borderRadius: 99, overflow: 'hidden', marginBottom: 2 }}>
          <div style={{ height: '100%', width: `${xpProgress}%`, background: 'linear-gradient(90deg, #F7C6D0, #D9C7F3)', borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ height: 1, background: '#EAE4E1', marginTop: 12 }} />
      </div>

      {/* HOME */}
      {tab === 'home' && (
        <div style={{ padding: '20px 20px 0', animation: 'fadeIn 0.3s ease' }}>
          {/* Energia */}
          <div style={{ background: 'white', borderRadius: 20, padding: '18px 20px', marginBottom: 14, boxShadow: '0 2px 16px rgba(180,150,180,0.10)' }}>
            <div style={{ fontSize: 12, color: '#8A7A82', fontWeight: 600, marginBottom: 10 }}>COMO ESTÁ SUA ENERGIA?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ k: 'low', e: '🌿', l: 'Baixa' }, { k: 'medium', e: '🌊', l: 'Média' }, { k: 'high', e: '🔥', l: 'Alta' }].map((o) => (
                <button key={o.k} onClick={() => setEnergy(o.k)} style={{ flex: 1, padding: '10px 6px', borderRadius: 14, border: 'none', background: energy === o.k ? (o.k === 'low' ? '#B8E0C8' : o.k === 'medium' ? '#D9C7F3' : '#F5D6A0') : '#EAE4E1', color: '#5A4A52', fontWeight: energy === o.k ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 20 }}>{o.e}</div>
                  <div>{o.l}</div>
                </button>
              ))}
            </div>
            {energyLabel && <div style={{ marginTop: 10, fontSize: 13, color: '#5A4A52', fontWeight: 500, textAlign: 'center' }}>{energyLabel}</div>}
          </div>

          {/* Sugestão */}
          {suggestion && (
            <div style={{ background: 'linear-gradient(135deg, #D9C7F344, #F7C6D044)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#8A7A82', fontWeight: 600, marginBottom: 4 }}>✨ FLUXINHO SUGERE</div>
              <div style={{ fontSize: 13, color: '#5A4A52', lineHeight: 1.5 }}>{suggestion}</div>
            </div>
          )}

          {/* Top 3 Tarefas */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5A4A52', marginBottom: 12 }}>🌊 Seu Fluxo de Hoje ({topTasks.length})</div>
          {topTasks.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 20, padding: '32px 20px', textAlign: 'center', boxShadow: '0 2px 16px rgba(180,150,180,0.10)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌸</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#5A4A52' }}>Tudo em dia!</div>
              <div style={{ fontSize: 13, color: '#8A7A82', marginTop: 4 }}>Cuide-se 💜</div>
            </div>
          ) : topTasks.map((task) => (
            <div key={task.id} style={{ background: 'white', borderRadius: 18, padding: '16px 18px', marginBottom: 10, boxShadow: '0 2px 12px rgba(180,150,180,0.10)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => toggleTask(task)} style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid #E8A0B0`, background: task.done ? '#E8A0B0' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                {task.done && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: task.done ? '#8A7A82' : '#5A4A52', textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
                <div style={{ fontSize: 11, color: '#8A7A82', marginTop: 3 }}>{task.type} · +{task.xp_value} XP</div>
              </div>
              <button onClick={() => { setFocusTask(task); setTab('focus') }} style={{ background: '#D9C7F3', border: 'none', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#5A4A52', cursor: 'pointer', fontFamily: 'inherit' }}>⏱</button>
            </div>
          ))}

          <button onClick={organizeFlow} style={{ width: '100%', padding: 16, marginTop: 8, borderRadius: 18, border: 'none', background: 'linear-gradient(135deg, #F7C6D0, #D9C7F3)', color: '#5A4A52', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(200,150,200,0.25)' }}>
            ✨ Organizar meu fluxo
          </button>
        </div>
      )}

      {/* TASKS */}
      {tab === 'tasks' && (
        <div style={{ padding: '20px 20px 0', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#5A4A52', marginBottom: 16 }}>📋 Meus Fluxos</div>
          <div style={{ background: 'white', borderRadius: 18, padding: '16px 18px', marginBottom: 16, boxShadow: '0 2px 12px rgba(180,150,180,0.10)' }}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nova tarefa..." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #EAE4E1', fontSize: 14, color: '#5A4A52', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10, background: '#FFF6F0' }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['operacional', 'cognitivo', 'autocuidado', 'trabalho', 'leve'].map((t) => (
                <button key={t} onClick={() => setNewTaskType(t)} style={{ padding: '6px 12px', borderRadius: 99, border: 'none', background: newTaskType === t ? '#D9C7F3' : '#EAE4E1', color: '#5A4A52', fontSize: 12, fontWeight: newTaskType === t ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>{t}</button>
              ))}
            </div>
            <button onClick={addTask} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #F7C6D0, #D9C7F3)', color: '#5A4A52', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>+ Adicionar</button>
          </div>
          {tasks.map((task) => (
            <div key={task.id} style={{ background: 'white', borderRadius: 18, padding: '16px 18px', marginBottom: 10, boxShadow: '0 2px 12px rgba(180,150,180,0.10)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => toggleTask(task)} style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid #E8A0B0`, background: task.done ? '#E8A0B0' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {task.done && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: task.done ? '#8A7A82' : '#5A4A52', textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
                <div style={{ fontSize: 11, color: '#8A7A82', marginTop: 3 }}>{task.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FOCUS */}
      {tab === 'focus' && (
        <div style={{ padding: '20px 20px 0', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#5A4A52', marginBottom: 20 }}>⏱ Modo Foco</div>
          {!focusTask ? (
            <div>
              <div style={{ fontSize: 14, color: '#8A7A82', marginBottom: 16 }}>Escolha uma tarefa para focar:</div>
              {tasks.filter((t) => !t.done).slice(0, 5).map((task) => (
                <div key={task.id} onClick={() => setFocusTask(task)} style={{ background: 'white', borderRadius: 18, padding: '16px 18px', marginBottom: 10, boxShadow: '0 2px 12px rgba(180,150,180,0.10)', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#5A4A52' }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: '#8A7A82', marginTop: 3 }}>{task.type}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: 'white', borderRadius: 24, padding: '24px 20px', marginBottom: 20, boxShadow: '0 2px 16px rgba(180,150,180,0.12)' }}>
                <div style={{ fontSize: 13, color: '#8A7A82', marginBottom: 6 }}>{pomodoroPhase === 'work' ? '🔥 Foco' : '🌿 Pausa'}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#5A4A52', marginBottom: 20 }}>{focusTask.title}</div>
                <div style={{ fontSize: 64, fontWeight: 800, color: '#5A4A52', letterSpacing: -2, marginBottom: 24 }}>{mins}:{secs}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setPomodoroRunning(!pomodoroRunning)} style={{ flex: 1, padding: 16, borderRadius: 16, border: 'none', background: pomodoroRunning ? '#EAE4E1' : 'linear-gradient(135deg, #F7C6D0, #D9C7F3)', color: '#5A4A52', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {pomodoroRunning ? '⏸ Pausar' : '▶ Iniciar'}
                  </button>
                  <button onClick={() => { setPomodoroSeconds(25 * 60); setPomodoroRunning(false); setPomodoroPhase('work') }} style={{ padding: '16px 18px', borderRadius: 16, border: 'none', background: '#EAE4E1', cursor: 'pointer', fontSize: 18 }}>↺</button>
                </div>
              </div>
              <button onClick={() => { toggleTask(focusTask); setFocusTask(null); setPomodoroRunning(false); setPomodoroSeconds(25 * 60) }} style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: '#B8E0C8', color: '#5A4A52', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>✓ Concluir tarefa</button>
              <button onClick={() => setFocusTask(null)} style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: '#EAE4E1', color: '#8A7A82', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Trocar tarefa</button>
            </div>
          )}
        </div>
      )}

      {/* JOURNAL */}
      {tab === 'journal' && (
        <div style={{ padding: '20px 20px 0', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#5A4A52', marginBottom: 16 }}>📓 Diário</div>
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 16, boxShadow: '0 2px 16px rgba(180,150,180,0.10)' }}>
            <div style={{ fontSize: 12, color: '#8A7A82', fontWeight: 600, marginBottom: 12 }}>COMO VOCÊ ESTÁ?</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {moods.map((m) => (
                <button key={m.key} onClick={() => setJournalMood(m.key)} style={{ flex: 1, padding: '10px 4px', borderRadius: 14, border: 'none', background: journalMood === m.key ? '#D9C7F3' : '#EAE4E1', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 22 }}>{m.emoji}</div>
                  <div style={{ fontSize: 10, color: '#5A4A52', fontWeight: 600 }}>{m.label}</div>
                </button>
              ))}
            </div>
            <textarea value={journalText} onChange={(e) => setJournalText(e.target.value.slice(0, 500))} placeholder="Como foi seu dia? (até 500 caracteres)" style={{ width: '100%', minHeight: 100, padding: '12px 14px', borderRadius: 14, border: '1.5px solid #EAE4E1', fontSize: 14, color: '#5A4A52', resize: 'none', fontFamily: 'inherit', background: '#FFF6F0', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
            <div style={{ fontSize: 11, color: '#8A7A82', textAlign: 'right', marginTop: 4, marginBottom: 12 }}>{journalText.length}/500</div>
            <button onClick={saveJournal} disabled={!journalMood} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: journalMood ? 'linear-gradient(135deg, #F7C6D0, #D9C7F3)' : '#EAE4E1', color: '#5A4A52', fontWeight: 700, fontSize: 14, cursor: journalMood ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Salvar registro 💜</button>
          </div>
          {journals.map((j) => (
            <div key={j.id} style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 12px rgba(180,150,180,0.08)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{moods.find((m) => m.key === j.mood)?.emoji || '💜'}</span>
                <span style={{ fontSize: 11, color: '#8A7A82' }}>{new Date(j.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {j.text && <div style={{ fontSize: 13, color: '#5A4A52', lineHeight: 1.5 }}>{j.text}</div>}
            </div>
          ))}
        </div>
      )}

      {/* PROFILE */}
      {tab === 'profile' && (
        <div style={{ padding: '20px 20px 0', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#5A4A52', marginBottom: 20 }}>⭐ Perfil</div>
          <div style={{ background: 'linear-gradient(135deg, #F7C6D0, #D9C7F3)', borderRadius: 24, padding: '28px 24px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{level >= 20 ? '🦋' : level >= 10 ? '🌊' : '🌸'}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#5A4A52' }}>Nível {level}</div>
            <div style={{ fontSize: 14, color: '#5A4A52', marginTop: 4 }}>{xp} XP · 🔥 {streak} dias seguidos</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Tarefas feitas', value: tasks.filter((t) => t.done).length, emoji: '✓' },
              { label: 'Registros', value: journals.length, emoji: '📓' },
              { label: 'Nível', value: level, emoji: '⭐' },
              { label: 'XP Total', value: xp, emoji: '✨' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'white', borderRadius: 18, padding: '16px 14px', textAlign: 'center', boxShadow: '0 2px 12px rgba(180,150,180,0.10)' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#5A4A52' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#8A7A82' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 12px rgba(180,150,180,0.10)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5A4A52', marginBottom: 10 }}>Progresso para Nível {level + 1}</div>
            <div style={{ height: 10, background: '#EAE4E1', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpProgress}%`, background: 'linear-gradient(90deg, #F7C6D0, #D9C7F3)', borderRadius: 99, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#8A7A82', marginTop: 6 }}>{xpProgress}/100 XP</div>
          </div>
        </div>
      )}

      {/* TAB BAR */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'rgba(255,246,240,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #EAE4E1', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 50 }}>
        {[
          { key: 'home', emoji: '🏠', label: 'Início' },
          { key: 'tasks', emoji: '📋', label: 'Fluxos' },
          { key: 'focus', emoji: '⏱', label: 'Foco' },
          { key: 'journal', emoji: '📓', label: 'Diário' },
          { key: 'profile', emoji: '⭐', label: 'Perfil' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0' }}>
            <div style={{ fontSize: 22, filter: tab === t.key ? 'none' : 'grayscale(0.4) opacity(0.6)', transform: tab === t.key ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.2s' }}>{t.emoji}</div>
            <div style={{ fontSize: 10, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? '#5A4A52' : '#8A7A82' }}>{t.label}</div>
            {tab === t.key && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#E8A0B0' }} />}
          </button>
        ))}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#5A4A52', color: 'white', padding: '10px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 200, whiteSpace: 'nowrap', animation: 'fadeIn 0.2s ease' }}>
          {toast}
        </div>
      )}

    </div>
  )
}
