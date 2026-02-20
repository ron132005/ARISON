const axios = require("axios");
const fs = require("fs");
const path = require("path");

const messages = [
  "🔍 Searching for your track...",
  "🎧 Fetching the audio...",
  "🚀 Preparing your song...",
  "🎶 Processing request...",
  "🎯 Almost ready...",
];

const dirPath = path.join(__dirname, "..", "temp", "song");
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = async (sender_psid, callSendAPI, messageText) => {
  const query = messageText.replace(/^\/?song\s+/i, "").trim();

  if (!query) {
    return callSendAPI(sender_psid, {
      text: "⚠️ Usage: /song [song name]",
    });
  }

  const randomMessage =
    messages[Math.floor(Math.random() * messages.length)];

  const mp3Path = path.join(dirPath, `song_${Date.now()}.mp3`);

  try {
    // ⏳ Processing message
    await callSendAPI(sender_psid, {
      text: `⏳ ${randomMessage}`,
    });

    // 🔗 API REQUEST
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/spt?title=${encodeURIComponent(query)}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });

    if (!data || !data.download_url) {
      throw new Error("Invalid API response");
    }

    const title = data.title || "Unknown Title";
    const artist = data.artists || "Unknown Artist";

    // ⏱ Convert duration
    const durationMs = Number(data.duration) || 0;
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    // 🎵 Download MP3
    const audioRes = await axios.get(data.download_url, {
      responseType: "arraybuffer",
      timeout: 0,
      maxRedirects: 10,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    fs.writeFileSync(mp3Path, audioRes.data);

    if (!fs.existsSync(mp3Path)) {
      throw new Error("Download failed");
    }

    const stats = fs.statSync(mp3Path);

    // 🚫 Messenger 25MB limit
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(mp3Path);
      throw new Error("File exceeds 25MB limit");
    }

    // 📄 Send Info
    await callSendAPI(sender_psid, {
      text:
        `🎧 𝑨.𝑹.𝑰.𝑺.𝑶.𝑵 𝑺𝑷𝑬𝑨𝑲𝑬𝑹𝑺\n\n` +
        `🎵 Title: ${title}\n` +
        `🎤 Artist: ${artist}\n` +
        `🕒 Duration: ${minutes}:${seconds}`,
    });

    // 🎶 Send Audio
    await callSendAPI(sender_psid, {
      attachment: { type: "audio", payload: {} },
      filedata: mp3Path,
    });

    // 🧹 Cleanup after 15s
    setTimeout(() => {
      if (fs.existsSync(mp3Path)) {
        fs.unlinkSync(mp3Path);
      }
    }, 15000);

  } catch (err) {
    console.error("Song API Error:", err.message);

    if (fs.existsSync(mp3Path)) {
      fs.unlinkSync(mp3Path);
    }

    await callSendAPI(sender_psid, {
      text: "❌ Unable to fetch this song right now. Please try again later.",
    });
  }
};

