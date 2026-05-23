// FLUXINHO ENGINE — funciona 100% sem IA
export const FluxinhoEngine = {
  energyMap: {
    low: {
      maxTasks: 2,
      types: ['autocuidado', 'leve'],
      label: 'Modo Gentil 🌸',
    },
    medium: {
      maxTasks: 3,
      types: ['operacional', 'trabalho'],
      label: 'Modo Fluxo 🌊',
    },
    high: {
      maxTasks: 3,
      types: ['cognitivo', 'criativo'],
      label: 'Modo Foco 🔥',
    },
  },

  priorityScore(task, energy) {
    let score = 0
    if (task.urgent) score += 40
    if (task.important) score += 30
    const types = this.energyMap[energy]?.types || []
    if (types.includes(task.type)) score += 20
    if (task.due_today) score += 10
    return score
  },

  organizeDay(tasks, energy) {
    const max = this.energyMap[energy]?.maxTasks || 3
    return tasks
      .filter((t) => !t.done)
      .map((t) => ({ ...t, _score: this.priorityScore(t, energy) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, max)
  },

  breakIntoMicrotasks(task) {
    const templates = {
      cognitivo: ['Preparar ambiente', 'Revisar contexto', 'Executar 25min', 'Revisar resultado'],
      operacional: ['Listar o que precisa', 'Executar passo a passo', 'Conferir ao final'],
      autocuidado: ['Reservar o momento', 'Sem distrações', 'Apreciar'],
      leve: ['Começar pequeno', 'Ir no seu ritmo'],
      trabalho: ['Verificar materiais', 'Executar', 'Registrar progresso'],
    }
    const steps = templates[task.type] || ['Começar', 'Continuar', 'Finalizar']
    return steps.map((label, i) => ({ id: i, label, done: false }))
  },

  suggestNext(tasks, energy) {
    const top = this.organizeDay(tasks, energy)[0]
    if (!top) return 'Você está livre hoje! Cuide-se 🌸'
    const micro = this.breakIntoMicrotasks(top)
    return `Em "${top.title}": ${micro[0]?.label} ✨`
  },

  xpForTask(task) {
    let xp = 10
    if (task.urgent) xp += 15
    if (task.important) xp += 10
    return xp
  },

  levelFromXP(xp) {
    return Math.min(50, Math.floor(xp / 100) + 1)
  },

  xpProgress(xp) {
    const current = (xp % 100)
    return current
  },
}
