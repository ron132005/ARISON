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

const cookiesPath = path.join(__dirname, "..", "cookies.txt");

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
      cookies: cookiesPath,
    });

    if (!info || !info.webpage_url) {
      throw new Error("No search results found");
    }

    const title = info.title || "Unknown Title";

    // 2️⃣ Download best audio under Messenger limit
    await ytdlp(info.webpage_url, {
      extractAudio: true,
      audioFormat: "m4a",
      format: "bestaudio[filesize<25M]/bestaudio",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noPlaylist: true,
      cookies: cookiesPath,
      quiet: true,
    });

    if (!fs.existsSync(filePath)) {
      throw new Error("Download failed");
    }

    const stats = fs.statSync(filePath);

    // Messenger 25MB limit
    if (stats.size > 25 * 1024 * 1024) {
      throw new Error("File exceeds 25MB limit");
    }

    // 3️⃣ Send title
    await callSendAPI(sender_psid, {
      text: `🎵 Now Playing:\n${title}`,
    });

    // 4️⃣ Send audio
    await callSendAPI(sender_psid, {
      attachment: { type: "audio", payload: {} },
      filedata: filePath,
    });

    // 5️⃣ Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 15000);

  } catch (err) {
    console.error("Song Error:", err.message);

    await callSendAPI(sender_psid, {
      text:
        "❌ Error: Unable to fetch the song. It may be unavailable or blocked by YouTube.",
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
