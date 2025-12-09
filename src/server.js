import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API Key
const API_KEY = "AIzaSyBeFXPR2WjqjCrkRFQ1LbgbX5zJlTJEdgc";
const MODEL = "gemini-2.0-flash";

// PROMPT DEL SISTEMA
const SYSTEM_PROMPT = `
Eres MIZA, asistente turístico de Manizales.

Reglas:
- Responde en 5-6 líneas máximo.
- Primera respuesta: "Hola, soy MIZA 🏔️".
- Luego solo saluda si el usuario dice su nombre.
- Temas permitidos: turismo, lugares, comida, deportes.
- Si está fuera de tema: "Eso está fuera de mis temas. Soy especialista en turismo 🏔️".
`;

// MOTOR DE REGLAS
function applyRules(userText) {
  const lower = userText.toLowerCase();
  let extraContext = "";

  if (lower.includes("lluvia") || lower.includes("lloviendo")) {
    extraContext += " [Clima lluvioso: recomienda museos, cafés, Recinto, Catedral] ";
  }
  if (lower.includes("soleado") || lower.includes("sol")) {
    extraContext += " [Clima soleado: recomienda actividades al aire libre como Nevado, Ecoparque, miradores] ";
  }

  const hour = new Date().getHours();
  if (hour >= 18) {
    extraContext += " [Es noche: evita senderismo, sugiere miradores, cafés seguros] ";
  } else if (hour >= 6 && hour <= 11) {
    extraContext += " [Es mañana: recomienda caminatas, tours naturales] ";
  }

  if (lower.includes("comer") || lower.includes("restaurantes")) {
    extraContext += " [Usuario busca comida: recomienda bandeja paisa, mazamorra, café local] ";
  }

  if (lower.includes("familia") || lower.includes("niños")) {
    extraContext += " [Lugares familiares: Recinto, Yarumos, Bosque Popular, Termales] ";
  }

  if (lower.includes("historia") || lower.includes("histórico") || lower.includes("iglesia")) {
    extraContext += " [Lugares históricos: Catedral Basílica, Torre del Cable, museos] ";
  }

  if (lower.includes("senderismo") || lower.includes("caminar") || lower.includes("ruta")) {
    extraContext += " [Rutas naturales: La Toscana, Ecoparque Alcázares, Yarumos, Chipre] ";
  }

  if (
    lower.includes("bailar") ||
    lower.includes("baile") ||
    lower.includes("discoteca") ||
    lower.includes("bar") ||
    lower.includes("fiesta") ||
    lower.includes("noche")
  ) {
    extraContext += " [Vida nocturna: zonas de bares y discotecas en el centro, cafés con música en vivo] ";
  }

  if (
    lower.includes("futbol") ||
    lower.includes("fútbol") ||
    lower.includes("once caldas") ||
    lower.includes("partido") ||
    lower.includes("estadio")
  ) {
    extraContext +=
      " [IMPORTANTE: Deportes/fútbol ES turismo. Recomienda el Palogrande, Once Caldas, horarios de partidos.] ";
  }

  return extraContext;
}

// HISTORIAL
const conversations = new Map();

app.get("/api/test", (req, res) => {
  res.json({
    status: "ok",
    model: MODEL,
    message: "MIZA Backend funcionando",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, sessionId = "default" } = req.body;

    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }

    // Reglas
    const rulesContext = applyRules(prompt);
    const enrichedPrompt = `${prompt} ${rulesContext}`;

    // Inicializar conversación
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, { history: [], isFirst: true });
    }

    const conv = conversations.get(sessionId);

    // Construir mensaje final
    let finalMessage = enrichedPrompt;

    if (conv.isFirst) {
      finalMessage = `${SYSTEM_PROMPT}\n\nAhora responde al usuario:\n${enrichedPrompt}`;
      conv.isFirst = false;
    } else {
      const recentHistory = conv.history.slice(-4);

      if (recentHistory.length > 0) {
        const historyText = recentHistory
          .map((msg) => `${msg.role === "user" ? "Usuario" : "MIZA"}: ${msg.text}`)
          .join("\n");

        finalMessage = `${historyText}\nUsuario: ${enrichedPrompt}`;
      }
    }

    // JSON string
    const jsonPayload = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: finalMessage }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.7,
        topP: 0.8,
      },
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    console.log("📤 Enviando a Gemini...");
    console.log("URL:", url);
    console.log("Payload:", jsonPayload);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: jsonPayload,
    });

    const data = await response.json();
    console.log("📥 Status:", response.status);

    if (!response.ok) {
      console.error("❌ Error de API:", data);

      const backupResponses = [
        "¡Hola! Soy MIZA 🏔️, tu asistente de turismo en Manizales. ¿En qué puedo ayudarte hoy?",
        "Para turismo en Manizales, te recomiendo visitar el Nevado del Ruiz, la Catedral Basílica y disfrutar del café de la región.",
        "¿Buscas actividades? Puedo recomendarte senderismo en el Ecoparque, visitas a cafetales o gastronomía local.",
        "La bandeja paisa es un plato típico imperdible.",
        "Para deportes, visita el Estadio Palogrande, hogar del Once Caldas.",
      ];

      const randomBackup = backupResponses[Math.floor(Math.random() * backupResponses.length)];

      if (conv.history.length === 0) {
        return res.json({
          reply: "¡Hola! Soy MIZA 🏔️, tu asistente de turismo en Manizales. ¿En qué puedo ayudarte?",
          model: "backup-system",
        });
      }

      return res.json({
        reply: randomBackup,
        model: "backup-system",
        error: data.error?.message,
      });
    }

    // Validar estructura
    if (
      data.candidates &&
      data.candidates[0]?.content?.parts &&
      data.candidates[0].content.parts[0]?.text
    ) {
      const reply = data.candidates[0].content.parts[0].text;

      // Guardar historial
      conv.history.push({ role: "user", text: enrichedPrompt });
      conv.history.push({ role: "model", text: reply });

      if (conv.history.length > 20) {
        conv.history = conv.history.slice(-20);
      }

      conversations.set(sessionId, conv);

      return res.json({
        reply,
        model: MODEL,
        sessionId,
        tokens: data.usageMetadata?.totalTokenCount || 0,
      });
    }

    throw new Error("Estructura de respuesta inválida");
  } catch (err) {
    console.error("❌ Error del servidor:", err);

    res.status(500).json({
      reply: "Lo siento, estoy teniendo problemas técnicos. Intenta de nuevo pronto.",
      error: err.message,
    });
  }
});

// LIMPIAR HISTORIAL
app.post("/api/clear", (req, res) => {
  const { sessionId = "default" } = req.body;
  conversations.delete(sessionId);
  res.json({ success: true, message: "Historial limpiado", sessionId });
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor MIZA activo en http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`);
  console.log(`🧠 Modelo: ${MODEL}`);
  console.log("📡 Endpoints:");
  console.log(` GET http://localhost:${PORT}/api/test`);
  console.log(` POST http://localhost:${PORT}/api/chat`);
  console.log(` POST http://localhost:${PORT}/api/clear`);
});
