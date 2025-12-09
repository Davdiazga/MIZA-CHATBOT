import React, { useState, useRef, useEffect } from "react";

// Colores del tema Blue Glass (Minimalista)
const BLUE_ACCENT = "#3572E2"; // Un azul vibrante y moderno

function speak(text, enabled = true) {
  if (!enabled) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "es-CO";
  msg.pitch = 1;
  msg.rate = 1;
  window.speechSynthesis.speak(msg);
}

// --- FUNCIÓN PARA CONSULTAR A LA IA (GEMINI) ---
async function getAIResponse(prompt, userName, visitedPlaces) {
  try {
    const placesInfo =
      visitedPlaces && visitedPlaces.length > 0
        ? `El usuario ya ha visitado o conoce estos lugares: ${visitedPlaces.join(
            ", "
          )}. No recomiendes estos lugares.`
        : "";

    const userGreeting = userName ? `El usuario se llama ${userName}.` : "";

    const fullPrompt = `${userGreeting}${placesInfo}\n\nPregunta: ${prompt}`;

    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt }),
    });

    if (!response.ok) {
      console.log("❌ Error en el servidor:", response.status);
      return "⚠️ El servidor no respondió correctamente.";
    }

    const data = await response.json();
    if (!data || !data.reply) return "😕 No hubo respuesta del modelo.";

    return data.reply;
  } catch (error) {
    console.log("Error al conectar:", error);
    return "🚫 No pude conectarme al servidor.";
  }
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "🌟 ¡Hola! Soy MIZA, tu guía turístico virtual de Manizales. Puedo recomendarte lugares, comidas, rutas y clima ☕️🏞️",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const [userName, setUserName] = useState("");
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // 🔥🔥🔥 AUTO-SCROLL (AGREGADO) 🔥🔥🔥
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);
  // ---------------------------------------------------

  const handleSend = async (customPrompt) => {
    const text = customPrompt || input;
    if (!text.trim()) return;

    // Detectar nombre
    const nameMatch = text.match(/(?:me llamo|soy|mi nombre es)\s+(\w+)/i);
    const detectedName = nameMatch?.[1];

    const currentName = userName || detectedName || "";

    if (detectedName && !userName) setUserName(detectedName);

    // Detectar lugares visitados
    const placeMatch = text.match(
      /(?:visité|estuve en|ya conocí|ya visité|fui a|conozco)\s+([a-zA-Záéíóúñ\s]+?)(?:\.|,|$)/i
    );

    let newVisited = [...visitedPlaces];

    if (placeMatch) {
      const place = placeMatch[1].trim();
      if (!newVisited.includes(place)) {
        newVisited.push(place);
        setVisitedPlaces(newVisited);
      }
    }

    const newMessages = [...messages, { from: "user", text }];
    setMessages(newMessages);
    setInput("");

    setLoading(true);
    setTypingText("✍️ MIZA está escribiendo...");

    const reply = await getAIResponse(text, currentName, newVisited);
    const safeReply = reply || "😕 No hubo respuesta.";

    setTypingText("");

    // Efecto tipo máquina
    let typed = "";
    for (let char of safeReply) {
      typed += char;
      setTypingText(typed);
      await new Promise((res) => setTimeout(res, 25));
    }

    setMessages([...newMessages, { from: "bot", text: safeReply }]);
    setTypingText("");
    setLoading(false);

    speak(safeReply, voiceEnabled);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz 😢");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = false;

    recognition.onstart = () => setTypingText("🎙️ Escuchando...");
    recognition.onerror = () => setTypingText("");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTypingText("");
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.start();
  };

  // 🔥 RETURN COMPLETO 🔥
  return (
    <div
  style={{
    maxWidth: "500px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: darkMode ? "#0F172A" : "#F8FAFF",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  }}
>

      {/* HEADER */}
      <div
        style={{
          background: `linear-gradient(90deg, ${BLUE_ACCENT}, #4D8AF0)`,
          color: "white",
          padding: "20px",
          textAlign: "center",
          borderRadius: "0 0 24px 24px",
          boxShadow: "0 4px 20px rgba(53, 114, 226, 0.3)",
        }}
      >
        <h1
          style={{
            fontSize: "100px",
            fontWeight: "700",
            marginBottom: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            fontFamily: "'Poppins'",
          }}
        >
          <img
            src="MIZABOT.png"
            alt="MIZA Logo"
            style={{ width: "100px", height: "100px" }}
          />
          MIZA
        </h1>

        <p style={{ fontFamily: "'Poppins'", fontSize: "30px", opacity: 0.9 }}>
          Asistente turístico de Manizales
        </p>

        {/* CONTROLES */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "15px",
          }}
        >
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              padding: "8px 15px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {darkMode ? "☀️ Claro" : "🌙 Oscuro"}
          </button>

          <button
            onClick={() => {
              if (voiceEnabled) {
                window.speechSynthesis.cancel();
              }
              setVoiceEnabled(!voiceEnabled);
            }}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              padding: "8px 15px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {voiceEnabled ? "🔊 Voz" : "🔇 Silencio"}
          </button>
        </div>
      </div>

      {/* MENSAJES */}
      <div
        style={{
          height: "calc(100vh - 250px)",
          overflowY: "auto",
          padding: "20px",
          background: darkMode
            ? "linear-gradient(180deg, #1E293B, #0F172A)"
            : "linear-gradient(180deg, #FFFFFF, #F8FAFF)",
        }}
      >
        {messages.map((msg, index) => (
  <div
    key={index}
    style={{
      marginBottom: "16px",
      display: "flex",
      justifyContent:
        msg.from === "user" ? "flex-end" : "flex-start",
      alignItems: "flex-start",
      gap: msg.from === "bot" ? "10px" : "0px"
    }}
  >
    {/* Avatar SOLO si es MIZA */}
    {msg.from === "bot" && (
      <img
        src="MIZABOT.png"
        alt="MIZA"
        style={{
          width: "45px",
          height: "45px",
          borderRadius: "50%",
          border: "2px solid #3572E2",
          objectFit: "cover"
        }}
      />
    )}

    <div
      style={{
        maxWidth: "80%",
        padding: "12px 16px",
        borderRadius: "18px",
        background:
          msg.from === "user"
            ? BLUE_ACCENT
            : darkMode
            ? "rgba(53,114,226,0.15)"
            : "rgba(53,114,226,0.1)",
        color:
          msg.from === "user"
            ? "white"
            : darkMode
            ? "#E2E8F0"
            : "#1E293B",
        border:
          msg.from === "bot"
            ? darkMode
              ? "1px solid rgba(53,114,226,0.3)"
              : "1px solid rgba(53,114,226,0.2)"
            : "none",
        lineHeight: "1.5",
        wordBreak: "break-word",
      }}
    >
      {msg.text}
    </div>
  </div>
))}


        {/* Indicador escribiendo */}
        {typingText && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 16px",
              color: darkMode ? "#94A3B8" : "#64748B",
              fontSize: "14px",
              fontStyle: "italic",
            }}
          >
            <span>{typingText}</span>
          </div>
        )}

        {/* 🔥🔥🔥 AUTO-SCROLL MARKER 🔥🔥🔥 */}
        <div ref={messagesEndRef} />
      </div>

      {/* INFORMACIÓN DEL USUARIO */}
      {(userName || visitedPlaces.length > 0) && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: darkMode
              ? "rgba(53,114,226,0.1)"
              : "rgba(53,114,226,0.05)",
            borderRadius: "12px",
            fontSize: "14px",
          }}
        >
          {userName && <div>👋 <strong>{userName}</strong></div>}

          {visitedPlaces.length > 0 && (
            <div>
              📍 <strong>Lugares conocidos:</strong>{" "}
              {visitedPlaces.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* INPUT */}
      <div
        style={{
          padding: "16px 20px",
          background: darkMode ? "#1E293B" : "white",
          borderTop: `1px solid ${
            darkMode ? "rgba(255,255,255,0.1)" : "rgba(53,114,226,0.1)"
          }`,
          position: "sticky",
          bottom: 0,
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && handleSend()
              }
              placeholder="Escribe tu mensaje..."
              style={{
                width: "100%",
                padding: "14px 20px",
                border: `2px solid ${
                  darkMode
                    ? "rgba(53,114,226,0.3)"
                    : "rgba(53,114,226,0.2)"
                }`,
                borderRadius: "50px",
                background: darkMode
                  ? "rgba(53,114,226,0.1)"
                  : "rgba(53,114,226,0.05)",
                fontSize: "15px",
                color: darkMode ? "#F1F5F9" : "#1E293B",
              }}
            />
          </div>

          <button
            onClick={() => handleSend()}
            disabled={loading}
            style={{
              background: BLUE_ACCENT,
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "20px",
            }}
          >
            {loading ? "⏳" : "➤"}
          </button>

          <button
            onClick={handleVoiceInput}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
            }}
          >
            🎤
          </button>
        </div>

        {/* Sugerencias */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["Lugares turísticos", "Comida típica", "Clima hoy", "Eventos"].map(
            (s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                style={{
                  padding: "8px 12px",
                  background: darkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(53,114,226,0.1)",
                  border: `1px solid ${
                    darkMode
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(53,114,226,0.2)"
                  }`,
                  borderRadius: "20px",
                  color: darkMode ? "#E2E8F0" : BLUE_ACCENT,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            )
          )}
        </div>
      </div>

      {/* CSS */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }

          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-thumb {
            background: ${BLUE_ACCENT};
            border-radius: 4px;
          }
        `}
      </style>
    </div>
  );
}
