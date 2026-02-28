const axios = require("axios");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

const messages = [
  "🔍 Searching for your track...",
  "🎧 Fetching the audio...",
  "🚀 Preparing your song...",
  "🎶 Processing request...",
  "🎯 Almost ready...",
];

const LIMIT = 25 * 1024 * 1024; // 25MB

const dirPath = path.join(__dirname, "..", "temp", "song");
fs.mkdirSync(dirPath, { recursive: true }); // mkdirSync with recursive is already idempotent

module.exports = async (sender_psid, callSendAPI, messageText) => {
  const query = messageText.replace(/^\/?song\s+/i, "").trim();

  if (!query) {
    return callSendAPI(sender_psid, { text: "⚠️ Usage: /song [song name]" });
  }

  const mp3Path = path.join(dirPath, `song_${Date.now()}.mp3`);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const cleanup = () => fs.rm(mp3Path, () => {});

  try {
    // Send status + fetch metadata in parallel
    const [, { data }] = await Promise.all([
      callSendAPI(sender_psid, { text: `⏳ ${randomMessage}` }),
      axios.get(
        `https://betadash-api-swordslush-production.up.railway.app/spt?title=${encodeURIComponent(query)}`,
        { timeout: 60000 },
      ),
    ]);

    if (!data || !data.download_url) throw new Error("Invalid API response");

    const title = data.title || "Unknown Title";
    const artist = data.artists || "Unknown Artist";

    const durationMs = Number(data.duration) || 0;
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    // Stream directly to disk — no full-file buffer in RAM
    const audioRes = await axios.get(data.download_url, {
      responseType: "stream",
      timeout: 0,
      maxRedirects: 10,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    // Write stream + early size abort
    await new Promise((resolve, reject) => {
      let totalBytes = 0;
      const writer = fs.createWriteStream(mp3Path);

      audioRes.data.on("data", (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > LIMIT) {
          writer.destroy();
          audioRes.data.destroy();
          reject(new Error("FILE_TOO_LARGE"));
        }
      });

      audioRes.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Send metadata and audio sequentially
    await callSendAPI(sender_psid, {
      text:
        `🎧 𝑨.𝑹.𝑰.𝑺.𝑶.𝑵 𝑺𝑷𝑬𝑨𝑲𝑬𝑹𝑺\n\n` +
        `🎵 Title: ${title}\n` +
        `🎤 Artist: ${artist}\n` +
        `🕒 Duration: ${minutes}:${seconds}`,
    });

    await callSendAPI(sender_psid, {
      attachment: { type: "audio", payload: {} },
      filedata: mp3Path,
    });

    cleanup();
  } catch (err) {
    cleanup();
    console.error("Song Error:", err.message);

    if (err.message === "FILE_TOO_LARGE") {
      return callSendAPI(sender_psid, {
        text: "❌ File exceeds 25MB limit. Try a shorter track.",
      });
    }

    callSendAPI(sender_psid, {
      text: "❌ Unable to fetch this song right now. Please try again later.",
    });
  }
};
