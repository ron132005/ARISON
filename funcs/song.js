const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const messages = [
  "🔍 Initiating auditory scan… detecting your track now.",
  "🎧 Commencing music retrieval sequence…",
  "🚀 Engaging sonic propulsion for optimal tune acquisition…",
  "🎶 Calibrating audio frequencies for your selection…",
  "🎯 Target successfully acquired, preparing transmission…",
  "🔊 Audio ready for deployment…",
];

const dirPath = path.join(__dirname, "..", "temp", "song");
if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

module.exports = async (sender_psid, callSendAPI, messageText) => {
  const query = messageText.replace(/^\/?song\s+/i, "").trim();

  if (!query) {
    return callSendAPI(sender_psid, {
      text: "⚠️ Usage: /song [song name]",
    });
  }

  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);
  const randomMessage =
    messages[Math.floor(Math.random() * messages.length)];

  try {
    await callSendAPI(sender_psid, { text: `⏳ ${randomMessage}` });

    // 1️⃣ Search YouTube
    const info = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noPlaylist: true,
    });

    if (!info || !info.webpage_url) {
      throw new Error("No search results found");
    }

    const title = info.title || "Unknown Title";

    // 2️⃣ Download best audio under 25MB limit
    await ytdlp(info.webpage_url, {
      extractAudio: true,
      audioFormat: "m4a",
      format: "bestaudio[filesize<25M]/bestaudio",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noPlaylist: true,
      quiet: true,
    });

    // 3️⃣ Ensure file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("File download failed");
    }

    const stats = fs.statSync(filePath);

    // Messenger limit check (25MB)
    if (stats.size > 25 * 1024 * 1024) {
      throw new Error("File exceeds Messenger size limit");
    }

    // 4️⃣ Send title first
    await callSendAPI(sender_psid, {
      text: `🎵 Now Playing:\n${title}`,
    });

    // 5️⃣ Send audio file
    await callSendAPI(sender_psid, {
      attachment: { type: "audio", payload: {} },
      filedata: filePath,
    });

    // 6️⃣ Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 15000);

  } catch (err) {
    console.error("Song Error:", err.message);

    await callSendAPI(sender_psid, {
      text:
        "❌ Error: Unable to fetch the song. It may be unavailable or too large.",
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
