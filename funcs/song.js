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
  // Extract query: assuming command is "/song [name]" or "song [name]"
  const query = messageText.replace(/^\/?song\s+/i, "").trim();

  if (!query) {
    return callSendAPI(sender_psid, { text: "⚠️ Usage: /song [song name]" });
  }

  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    // 1. Send initial status message
    await callSendAPI(sender_psid, { text: `⏳ ${randomMessage}` });

    // 2. Fetch metadata using yt-dlp
    const info = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noPlaylist: true,
      preferFreeFormats: true,
    });

    const videoInfo = Array.isArray(info) ? info[0] : info;
    const title = videoInfo.title || "Unknown Title";

    // 3. Download the audio
    await ytdlp(videoInfo.webpage_url, {
      extractAudio: true,
      audioFormat: "m4a",
      format: "bestaudio[ext=m4a]/tiny",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noPlaylist: true,
    });

    // 4. Send the file
    // NOTE: Official FB API requires a specific structure for attachments.
    // Most 'callSendAPI' helpers for official bots use a URL or a stream.
    await callSendAPI(sender_psid, {
      attachment: {
        type: "audio",
        payload: {
          is_reusable: true,
        },
      },
      filedata: filePath, // Your callSendAPI needs to handle the local path/stream
    });

    // 5. Cleanup file after sending
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 10000);
  } catch (err) {
    console.error("Song Error:", err);
    callSendAPI(sender_psid, {
      text: "❌ Error: Unable to fetch the song. Please try a different name.",
    });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}; 
