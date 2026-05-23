import { useState } from "react"

export default function Home() {
  const [level] = useState(1)
  const [xp] = useState(0)

  const tasks = [
    { id: 1, title: "Organizar manhã", done: false },
    { id: 2, title: "Responder mensagens", done: false },
    { id: 3, title: "Cuidar de você", done: false }
  ]

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#FFF6F0",
      padding: 20,
      fontFamily: "system-ui"
    }}>
      {/* HEADER */}
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

      {/* TASKS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 14,
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ fontSize: 14, color: "#3A2F35", fontWeight: 600 }}>
              {task.title}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER ACTION */}
      <div style={{ marginTop: 30 }}>
        <button
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "none",
            backgroundColor: "#F7C6D0",
            fontWeight: 700,
            color: "#3A2F35"
          }}
        >
          Organizar meu fluxo
        </button>
      </div>
    </div>
  )
}