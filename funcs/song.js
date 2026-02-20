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

// Use /tmp for Render compatibility
const dirPath = "/tmp/songs";
if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

module.exports = async (sender_psid, callSendAPI, query) => {
  const filename = `song_${Date.now()}.m4a`;
  const filePath = path.join(dirPath, filename);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    // 1. Send status
    await callSendAPI(sender_psid, { text: `⏳ ${randomMessage}` });

    // 2. Search and Download
    // Using ytsearch1: ensures it picks the first result
    await ytdlp(`ytsearch1:${query}`, {
      extractAudio: true,
      audioFormat: "m4a",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noCheckCertificates: true,
      noPlaylist: true,
    });

    // 3. Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found after download.");
    }

    // 4. Send to callSendAPI
    // We pass the FILE PATH as a string because your index.js handles createReadStream
    await callSendAPI(sender_psid, {
      attachment: { type: "audio" },
      filedata: filePath 
    });

    // 5. Cleanup after 2 minutes (gives FB time to process)
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 120000);

  } catch (err) {
    console.error("Song Error:", err);
    callSendAPI(sender_psid, {
      text: "❌ Error: Unable to fetch that song. Try a different title.",
    });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
