const axios = require("axios");

// Helper function: send text in Messenger-safe chunks
const sendInChunks = async (psid, text, callSendAPI, prefix = "") => {
  const CHUNK_SIZE = 1900; // safe buffer for Messenger
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    await callSendAPI(psid, { text: i === 0 ? prefix + chunk : chunk });
  }
};

module.exports = async (sender_psid, callSendAPI, messageText) => {
  // Keep everything after /lyrics as-is
  const songQuery = messageText.replace(/^\/lyrics\s*/i, "").trim();

  if (!songQuery) {
    return callSendAPI(sender_psid, {
      text: "⚠️ Usage: /lyrics [song name]",
    });
  }

  try {
    // 1️⃣ Fetch lyrics from Popcat API
    const res = await axios.get(
      `https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(songQuery)}`,
      { timeout: 15000 }
    );

    if (!res.data || res.data.error || !res.data.message) {
      return callSendAPI(sender_psid, {
        text: `ℹ️ No lyrics found for "${songQuery}".`,
      });
    }

    const { title, artist, lyrics, url } = res.data.message;

    if (!lyrics) throw new Error("Lyrics not found");

    // 2️⃣ Remove Genius description paragraph before actual lyrics
    let cleanedLyrics = lyrics.replace(/Lyrics[\s\S]*?(?=\n?\[)/, "");

    // Clean extra spacing
    cleanedLyrics = cleanedLyrics.replace(/\n{3,}/g, "\n\n").trim();

    // 3️⃣ Prefix for the first chunk only
    const firstChunkPrefix = `🎵 ${title} — ${artist}\n\n`;

    // 4️⃣ Send first chunk + remaining lyrics safely
    await sendInChunks(sender_psid, cleanedLyrics + `\n\n🔗 ${url}`, callSendAPI, firstChunkPrefix);

  } catch (err) {
    console.error("Lyrics Error:", err.message);

    await callSendAPI(sender_psid, {
      text: "❌ Unable to fetch lyrics right now.",
    });
  }
};
