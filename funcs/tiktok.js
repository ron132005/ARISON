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

    const apiUrl = `https://tikdownpro.vercel.app/api/download?url=${encodeURIComponent(link)}`;
    const { data } = await axios.get(apiUrl);

    // ✅ Validate response properly
    if (!data || data.status !== true || !Array.isArray(data.video) || !data.video[0]) {
      throw new Error("Invalid API response structure");
    }

    const videoUrl = data.video[0]; // ✅ FIXED
    const caption = data.title || "TikTok Video";

    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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
      attachment: {
        type: "video",
        payload: {},
      },
      filedata: filePath,
    });

    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 10000);

  } catch (err) {
    console.error("TikTok Handler Error:", err.message);

    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    await callSendAPI(psid, {
      text: "❌ Unable to download this TikTok video.",
    });
  }
};

