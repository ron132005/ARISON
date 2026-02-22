const axios = require("axios");

module.exports = async (sender_psid, callSendAPI, messageText) => {
  // ✅ Keep everything after /lyrics as-is
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

    // 2️⃣ Clean unwanted Genius description before actual lyrics
    let cleanedLyrics = lyrics.replace(/Lyrics[\s\S]*?(?=\n?\[)/, "");

    // Remove extra spacing
    cleanedLyrics = cleanedLyrics.replace(/\n{3,}/g, "\n\n").trim();

    // 3️⃣ Messenger safe limit
    const MAX = 1900;
    if (cleanedLyrics.length > MAX) {
      cleanedLyrics = cleanedLyrics.slice(0, MAX) + "\n\n(Truncated...)";
    }

    // 4️⃣ Send formatted response
    await callSendAPI(sender_psid, {
      text: `🎵 ${title} — ${artist}\n\n${cleanedLyrics}\n\n🔗 ${url}`,
    });

  } catch (err) {
    console.error("Lyrics Error:", err.message);

    await callSendAPI(sender_psid, {
      text: "❌ Unable to fetch lyrics right now.",
    });
  }
};
