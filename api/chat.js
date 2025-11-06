// /api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Leer body (Vercel frameworkless no parsea req.body)
  const body = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });

  const { messages, model } = body || {};

  if (!process.env.AI_API_URL || !process.env.AI_API_KEY) {
    return res.status(500).json({
      error:
        "Faltan variables de entorno AI_API_URL o AI_API_KEY en Vercel Settings → Environment Variables.",
    });
  }

  try {
    const upstream = await fetch(process.env.AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        // opcional:
        temperature: 0.6,
      }),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // si la API devolvió HTML/texto de error
      return res.status(upstream.status).json({ error: text });
    }

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ error: data.error?.message || JSON.stringify(data) });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
