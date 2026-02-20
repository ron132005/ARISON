const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://www.whenisthenextmcufilm.com/api";

module.exports = async function (sender_psid, callSendAPI) {
  const tempDir = path.join(__dirname, "..", "temp", "mcu");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Notify user
    await callSendAPI(sender_psid, { text: "🎬 Fetching next MCU movie..." });

    // 1️⃣ Fetch data
    const response = await axios.get(API_BASE, { timeout: 15000 });
    const data = response.data;

    if (!data || !data.title) {
      return callSendAPI(sender_psid, { text: "ℹ️ No upcoming MCU movie found." });
    }

    // 2️⃣ Download poster image
    const posterUrl = data.poster_url;
    const filePath = path.join(tempDir, `poster_${Date.now()}.jpg`);

    const posterResp = await axios({
      method: "GET",
      url: posterUrl,
      responseType: "stream",
      timeout: 15000,
    });

    const writer = fs.createWriteStream(filePath);
    posterResp.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // 3️⃣ Send title and release date
    const message = `🎬 ${data.title}\n🗓 Release Date: ${data.release_date}`;
    await callSendAPI(sender_psid, { text: message });

    // 4️⃣ Send poster image
    await callSendAPI(sender_psid, {
      attachment: { type: "image", payload: {} },
      filedata: filePath,
    });

    // 5️⃣ Cleanup temp file
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 10000);

  } catch (err) {
    console.error("MCU Handler Error:", err.message);
    await callSendAPI(sender_psid, {
      text: "❌ Failed to fetch next MCU movie.",
    });
  }
};
