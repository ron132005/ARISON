
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

module.exports = async (sender_psid, callSendAPI, query) => {
  if (!query) {
    return callSendAPI(sender_psid, { text: "⚠️ Usage: /song [song name]" });
  }

  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    // 1️⃣ Send a "loading" message
    await callSendAPI(sender_psid, { text: `⏳ ${randomMessage}` });

    // 2️⃣ Fetch video info
    const info = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noPlaylist: true,
      preferFreeFormats: true,
    });

    const videoInfo = Array.isArray(info) ? info[0] : info;
    if (!videoInfo || !videoInfo.webpage_url) throw new Error("No results found");

    // 3️⃣ Download audio
    await ytdlp(videoInfo.webpage_url, {
      extractAudio: true,
      audioFormat: "m4a",
      format: "bestaudio[ext=m4a]/bestaudio",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noPlaylist: true,
    });

    // 4️⃣ Send audio using your callSendAPI
    await callSendAPI(sender_psid, {
      attachment: { type: "audio" },
      filedata: filePath,
    });

    // 5️⃣ Cleanup
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Song Error:", err);
    await callSendAPI(sender_psid, {
      text: "❌ Error: Unable to fetch the song. Please try a different name.",
    });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
