const Tiktok = require("@tobyg74/tiktok-api-dl");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async function (psid, callSendAPI, text) {
  const tiktokRegex = /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/;
  const match = text.match(tiktokRegex);
  const link = match ? match[0] : null;

  if (!link) return;

  const dir = path.join(__dirname, "..", "temp", "tiktok");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${Date.now()}.mp4`);

  try {
    await callSendAPI(psid, { text: "⏳ Downloading TikTok video..." });

    const result = await Tiktok.Downloader(link, { version: "v1" });

    if (!result || result.status !== "success" || !result.result) {
      throw new Error("Failed to fetch TikTok metadata");
    }

    const videoUrl =
      result.result.video1 ||
      result.result.video ||
      result.result.video_hd;

    const caption = result.result.description || "TikTok Video";

    if (!videoUrl) {
      throw new Error("No downloadable video URL found");
    }

    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Referer: "https://www.tiktok.com/",
      },
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    if (!fs.existsSync(filePath)) {
      throw new Error("File not created");
    }

    const stats = fs.statSync(filePath);

    // Messenger 25MB limit
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      throw new Error("Video exceeds 25MB Messenger limit");
    }

    await callSendAPI(psid, {
      text: `🎬 ${caption}`,
    });

    await callSendAPI(psid, {
      attachment: {
        type: "video",
        payload: {},
      },
      filedata: filePath,
    });

    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 10000);

  } catch (err) {
    console.error("TikTok Handler Error:", err.message);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    await callSendAPI(psid, {
      text: "❌ Unable to download this TikTok video.",
    });
  }
};
