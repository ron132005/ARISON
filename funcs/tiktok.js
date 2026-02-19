const Tiktok = require("@tobyg74/tiktok-api-dl");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async function (psid, callSendAPI, text) {
  // 1. Improved regex to find the link anywhere in the message
  const tiktokRegex = /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/;
  const match = text.match(tiktokRegex);
  const link = match ? match[0] : null;

  if (!link) return;

  const dir = path.join(__dirname, "..", "temp", "tiktok");
  const filePath = path.join(dir, `${Date.now()}.mp4`);

  try {
    // 2. Ensure directory exists before starting
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 3. Fetch Data - Using 'v1' as it's often more stable for downloads
    const result = await Tiktok.Downloader(link, { version: "v1" });

    // Check if result is successful
    if (result.status !== "success" || !result.result) {
      console.error("TikTok API Error: Failed to fetch metadata");
      return;
    }

    // Version 3 usually provides 'video' as a direct URL or an array
    const videoUrl =
      result.result.video1 || result.result.video || result.result.video_hd;
    const caption = result.result.description || "TikTok Video";

    if (!videoUrl) {
      console.error("No video URL found in response");
      return;
    }

    // 4. Download with proper stream handling
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
      writer.on("error", (err) => {
        writer.close();
        reject(err);
      });
    });

    // 5. Send the file
    // Note: Ensure your callSendAPI is configured to handle local 'filedata' paths
    await callSendAPI(psid, {
      attachment: {
        type: "video",
        payload: {
          is_reusable: true,
        },
      },
      filedata: filePath,
    });

    // Small delay to ensure the API has finished reading the file before unlinking
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 5000);
  } catch (err) {
    console.error("TikTok Handler Error:", err.message);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
  }
};
