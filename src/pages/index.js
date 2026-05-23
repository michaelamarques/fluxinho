import { useState } from "react"

export default function Home() {
  const [level] = useState(1)
  const [xp] = useState(0)

  const tasks = [
    { id: 1, title: "Organizar manhã" },
    { id: 2, title: "Responder mensagens" },
    { id: 3, title: "Cuidar de você" }
  ]

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#FFF6F0",
      padding: 20,
      fontFamily: "system-ui"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#5A4A52" }}>
            Fluxinho 🌊
          </div>
          <div style={{ fontSize: 12, color: "#8A7A82" }}>
            Nível {level} · {xp} XP
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tasks.map(task => (
          <div
            key={task.id}
            style={{
              backgroundColor: "#fff",
              padding: 14,
              borderRadius: 12,
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
            }}
          >
            {task.title}
          </div>
        ))}
      </div>

      <button
        style={{
          marginTop: 30,
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "none",
          backgroundColor: "#F7C6D0",
          fontWeight: 700
        }}
      >
        Organizar meu fluxo
      </button>
    </div>
  )
}