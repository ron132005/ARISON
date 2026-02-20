const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");

const messages = [
  "🔍 Initiating auditory scan… detecting your track now.",
  "🎧 Commencing music retrieval sequence…",
  "🚀 Engaging sonic propulsion for optimal tune acquisition…",
  "🎶 Calibrating audio frequencies for your selection…",
  "🎯 Target successfully acquired, preparing transmission…",
  "🔊 Audio ready for deployment…",
];

// Safe temp folder in Render
const dirPath = path.join("/tmp", "song");
if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

module.exports = async (sender_psid, callSendAPI, query) => {
  if (!query) {
    return callSendAPI(sender_psid, { text: "⚠️ Usage: /song [song name]" });
  }

  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    // 1️⃣ Send status
    await callSendAPI(sender_psid, { text: `⏳ ${randomMessage}` });

    // 2️⃣ Fetch video info
    const info = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noPlaylist: true,
      preferFreeFormats: true,
    });

    const videoInfo = Array.isArray(info) ? info[0] : info;
    const videoUrl = videoInfo.webpage_url;

    // 3️⃣ Download audio (Render-safe)
    await ytdlp(videoUrl, {
      extractAudio: true,
      audioFormat: "m4a",
      output: filePath,
      noPlaylist: true,
      // ❌ Remove ffmpegLocation entirely to use system ffmpeg
    });

    // 4️⃣ Send audio file via your existing callSendAPI
    await callSendAPI(sender_psid, {
      attachment: { type: "audio", payload: {} },
      filedata: filePath,
    });

    // 5️⃣ Cleanup after sending
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 10000);

  } catch (err) {
    console.error("Song Error:", err);
    if (err.stderr) console.error("STDERR:", err.stderr);
    if (err.stdout) console.error("STDOUT:", err.stdout);

    callSendAPI(sender_psid, {
      text: "❌ Error: Unable to fetch the song. Please try a different name.",
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

