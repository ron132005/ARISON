const ytdlp = require("yt-dlp-exec").create({
  binary: require("yt-dlp-exec/bin"),
});

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

// Ensure temp directory exists
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

  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    // 1️⃣ Send initial status
    await callSendAPI(sender_psid, {
      text: `⏳ ${randomMessage}`,
    });

    // 2️⃣ Search video
    const info = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noPlaylist: true,
      preferFreeFormats: true,
    });

    const videoInfo = Array.isArray(info) ? info[0] : info;

    if (!videoInfo || !videoInfo.webpage_url) {
      throw new Error("No video found");
    }

    const title = videoInfo.title || "Unknown Title";

    console.log("Downloading:", title);
    console.log("URL:", videoInfo.webpage_url);

    // 3️⃣ Download audio
    await ytdlp(videoInfo.webpage_url, {
      extractAudio: true,
      audioFormat: "m4a",
      format: "bestaudio[ext=m4a]/bestaudio",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noPlaylist: true,
    });

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("File was not created");
    }

    console.log("Download complete:", filePath);

    // 4️⃣ Send file (your existing callSendAPI must support local file path)
    await callSendAPI(sender_psid, {
      attachment: {
        type: "audio",
        payload: {
          is_reusable: true,
        },
      },
      filedata: filePath,
    });

    // 5️⃣ Cleanup after 15 seconds
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("Temp file deleted");
      }
    }, 15000);

  } catch (err) {
    console.error("========== SONG ERROR ==========");
    console.error("Message:", err.message);
    console.error("STDERR:", err.stderr);
    console.error("STDOUT:", err.stdout);
    console.error("Full Error:", err);
    console.error("================================");

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await callSendAPI(sender_psid, {
      text: "❌ Error: Unable to fetch the song. Please try a different name.",
    });
  }
};
