const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

// You can use your existing PAGE_ACCESS_TOKEN
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "EAAUyQ2YrkywBQ3LHXLip0fTynkXnKg56iDUqm1RRpF5f3hVBPcwi1mksKBhrB5vmZCUVfORjkkDGZCSHCtmMZB0zKoWkBeHyNCBZCj8XCcVDU4VSW1WmE3WsjYGrcJ29E4PZB2goe8wpN05PTTSmIGHcL33VqpSY4upUuXc2ixryrbqEINCUFPFFvfnuibuaiIqOSPAZDZD";

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

    // 1️⃣ Get TikTok download link
    const apiUrl = `https://tikdownpro.vercel.app/api/download?url=${encodeURIComponent(link)}`;
    const { data } = await axios.get(apiUrl);

    if (!data || data.status !== true || !Array.isArray(data.video) || !data.video[0]) {
      throw new Error("Invalid API response structure");
    }

    const videoUrl = data.video[0];
    const caption = data.title || "TikTok Video";

    // 2️⃣ Download video locally
    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.tiktok.com/" },
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    if (!fs.existsSync(filePath)) throw new Error("File not created");

    const stats = fs.statSync(filePath);
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      throw new Error("Video exceeds 25MB Messenger limit");
    }

    // 3️⃣ Upload video to Messenger to get attachment_id
    const form = new FormData();
    form.append("recipient", JSON.stringify({ id: psid }));
    form.append(
      "message",
      JSON.stringify({ attachment: { type: "video", payload: { is_reusable: true } } })
    );
    form.append("filedata", fs.createReadStream(filePath));

    const uploadRes = await axios.post(
      `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      form,
      { headers: form.getHeaders() }
    );

    const attachmentId = uploadRes.data.attachment_id;
    if (!attachmentId) throw new Error("Failed to get attachment_id");

    // 4️⃣ Send final message with caption + video together
    await callSendAPI(psid, {
      recipient: { id: psid },
      message: {
        text: `🎬 ${caption}`,
        attachment: {
          type: "video",
          payload: { attachment_id: attachmentId },
        },
      },
    });

    // 5️⃣ Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 10000);

  } catch (err) {
    console.error("TikTok Handler Error:", err.message);

    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    await callSendAPI(psid, { text: "❌ Unable to download this TikTok video." });
  }
};
