import express from "express";
import cors from "cors";
import fetch from "node-fetch";

// Motor de reglas
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

  return extraContext;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API KEY
const API_KEY = "AIzaSyBucVMhPr28SETR9fpD_MzGuCRZP7LQLUU";

// PROMPT MAESTRO
const SYSTEM_PROMPT = `Eres MIZA, asistente turístico de Manizales. CUMPLE ESTAS REGLAS SIN EXCEPCIÓN:

ESTRUCTURA Y FORMATO:
• Máximo 5–6 líneas por respuesta (OBLIGATORIO).
• Usa viñetas (•) para listas, nunca párrafos largos.
• Máximo 1 emoji por respuesta.
• Responde corto, claro, directo.

PRESENTACIÓN:
• Solo preséntate en la PRIMERA respuesta con: "Hola, soy MIZA 🏔️"
• En respuestas siguientes, NUNCA repitas saludos ni tu presentación.
• Si el usuario dice su nombre, salúdalo brevemente: "Hola [nombre]!"

INFORMACIÓN:
• Solo recomienda lugares REALES de Manizales (Nevado, Catedral, Parque La Marina, Zoológico, Región Cafetera).
• Incluye detalles prácticos: horarios aproximados, ubicación o distancia.
• Nunca repitas información que ya diste.

TEMAS FUERA DEL TURISMO:
• Si pregunta sobre política, deportes, tecnología, o temas no turísticos, RESPONDE EXACTAMENTE:
  "Eso está fuera de mis temas. Soy especialista en turismo de Manizales 🏔️ ¿Qué lugar te gustaría conocer?"
• No hagas excepciones, no argumentes.

RESTRICCIONES FINALES:
• Nunca escribas párrafos largos.
• Nunca hagas listas con más de 4 elementos.
• Nunca exageres o inventes información.
• Si no sabes, di: "No tengo esa información, pero puedo ayudarte con lugares turísticos."
`;

let conversationHistory = [];

app.post("/api/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt;
    console.log("📝 Prompt recibido:", userPrompt);
    
    // Aplicar reglas
    const rulesContext = applyRules(userPrompt);
    const enrichedPrompt = `${userPrompt}${rulesContext}`;

    // Agregar al historial
    conversationHistory.push({
      role: "user",
      parts: [{ text: enrichedPrompt }]
    });

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=" +
      API_KEY;

    const payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: conversationHistory,
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
      }
    };

    console.log("📤 Enviando a Gemini...");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("📥 Status de respuesta:", response.status);
    
    const data = await response.json();
    console.log("📊 Datos de Gemini:", JSON.stringify(data, null, 2));

    // Verificar errores de la API
    if (data.error) {
      console.error("❌ Error de Gemini API:", data.error);
      return res.json({ 
        reply: `Error de API: ${data.error.message}` 
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ Estructura de respuesta inesperada.";

    console.log("✅ Respuesta final:", reply);

    // Guardar en historial
    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });

    res.json({ reply });

  } catch (err) {
    console.error("💥 Error en servidor:", err);
    res.status(500).json({ reply: `Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor activo en http://localhost:${PORT}`);
});
