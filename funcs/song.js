const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const YouTube = require("youtube-sr").default;
const ffmpeg = require("fluent-ffmpeg");
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
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    await callSendAPI(sender_psid, { text: `⏳ ${randomMessage}` });

    // 1️⃣ Search YouTube
    const video = await YouTube.searchOne(query);
    if (!video) throw new Error("No video found");

    console.log("Downloading:", video.title, video.url);

    // 2️⃣ Stream & convert audio
    await new Promise((resolve, reject) => {
      ffmpeg(ytdl(video.url, { filter: "audioonly", quality: "highestaudio" }))
        .setFfmpegPath(ffmpegPath)
        .audioBitrate(128)
        .toFormat("m4a")
        .save(filePath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("Download complete:", filePath);

    // 3️⃣ Send file
    await callSendAPI(sender_psid, {
      attachment: { type: "audio", payload: { is_reusable: true } },
      filedata: filePath,
    });

    // 4️⃣ Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 15000);

  } catch (err) {
    console.error("========== SONG ERROR ==========");
    console.error(err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await callSendAPI(sender_psid, {
      text: "❌ Error: Unable to fetch the song. Please try a different name.",
    });
  }
};
