const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const dirPath = "/tmp/songs";
if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

module.exports = async (sender_psid, callSendAPI, query) => {
  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);

  try {
    await callSendAPI(sender_psid, { text: "⏳ Processing your request..." });

    await ytdlp(`ytsearch1:${query}`, {
      extractAudio: true,
      audioFormat: "m4a",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noCheckCertificates: true,
      noPlaylist: true,
      forceIpv4: true, // IMPORTANT: Fixes many connection issues on cloud hosts
      addHeader: [
        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });

    if (fs.existsSync(filePath)) {
      await callSendAPI(sender_psid, {
        attachment: { type: "audio" },
        filedata: filePath 
      });

      // Cleanup
      setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
    } else {
      throw new Error("Download completed but file not found.");
    }

  } catch (err) {
    console.error("DETAILED ERROR:", err); // This will show in Render logs
    callSendAPI(sender_psid, { text: "❌ Connection error. Please try again in a moment." });
  }
};
