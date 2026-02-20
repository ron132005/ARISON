const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

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

  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);
  const randomMessage =
    messages[Math.floor(Math.random() * messages.length)];

  try {
    await callSendAPI(sender_psid, {
      text: `⏳ ${randomMessage}`,
    });

    // 1️⃣ SEARCH (Android client, no cookies)
    const searchResult = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noPlaylist: true,
      extractorArgs: "youtube:player_client=android",
      quiet: true,
    });

    if (
      !searchResult ||
      !searchResult.entries ||
      !searchResult.entries.length ||
      !searchResult.entries[0]
    ) {
      throw new Error("No search results found");
    }

    const video = searchResult.entries[0];
    const videoUrl = video.webpage_url;
    const title = video.title || "Unknown Title";

    if (!videoUrl) {
      throw new Error("Invalid video URL");
    }

    // 2️⃣ DOWNLOAD AUDIO
    await ytdlp(videoUrl, {
      extractAudio: true,
      audioFormat: "m4a",
      format: "bestaudio",
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noPlaylist: true,
      extractorArgs: "youtube:player_client=android",
      quiet: true,
    });

    if (!fs.existsSync(filePath)) {
      throw new Error("Download failed");
    }

    const stats = fs.statSync(filePath);

    // Messenger 25MB limit
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      throw new Error("File exceeds 25MB limit");
    }

    // 3️⃣ SEND TITLE
    await callSendAPI(sender_psid, {
      text: `🎵 Now Playing:\n${title}`,
    });

    // 4️⃣ SEND AUDIO
    await callSendAPI(sender_psid, {
      attachment: { type: "audio", payload: {} },
      filedata: filePath,
    });

    // 5️⃣ CLEANUP
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 15000);

  } catch (err) {
    console.error("Song Error:", err.message);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await callSendAPI(sender_psid, {
      text:
        "❌ Unable to fetch this song right now. YouTube may be blocking this server.",
    });
  }
};
