const axios = require("axios");
const cheerio = require("cheerio");

const GENIUS_TOKEN = "R9XTZG4bAf6hXETxx53Plo0TiXEpdl4EHNml4psOJ9lzgFukCAX_CKrpdNunoEiI";

module.exports = async (sender_psid, callSendAPI, messageText) => {
  const query = messageText.split(" ").slice(1).join(" ").trim();

  if (!query) {
    return callSendAPI(sender_psid, {
      text: "⚠️ Usage: /lyrics [song name]",
    });
  }

  if (!GENIUS_TOKEN) {
    return callSendAPI(sender_psid, {
      text: "❌ Genius API token not configured.",
    });
  }

  try {
    // 1️⃣ Search song using official Genius API
    const searchRes = await axios.get(
      "https://api.genius.com/search",
      {
        params: { q: query },
        headers: {
          Authorization: `Bearer ${GENIUS_TOKEN}`,
        },
        timeout: 15000,
      }
    );

    const hits = searchRes.data.response.hits;

    if (!hits || hits.length === 0) {
      return callSendAPI(sender_psid, {
        text: `ℹ️ No lyrics found for "${query}".`,
      });
    }

    const song = hits[0].result;
    const songUrl = song.url;

    // 2️⃣ Scrape lyrics page
    const page = await axios.get(songUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(page.data);

    let lyrics = "";

    // Genius modern layout
    $('div[data-lyrics-container="true"]').each((i, elem) => {
      lyrics += $(elem).text() + "\n";
    });

    if (!lyrics) {
      throw new Error("Lyrics scraping failed");
    }

    // 3️⃣ Clean lyrics
    lyrics = lyrics.replace(/\n{3,}/g, "\n\n").trim();

    // 4️⃣ Messenger safe limit (MAX 2000)
    const MAX = 1900;
    if (lyrics.length > MAX) {
      lyrics = lyrics.slice(0, MAX) + "\n\n(Truncated...)";
    }

    // 5️⃣ Send
    await callSendAPI(sender_psid, {
      text: `🎵 ${song.full_title}\n\n${lyrics}`,
    });

  } catch (err) {
    console.error("Lyrics Error:", err.message);

    await callSendAPI(sender_psid, {
      text: "❌ Unable to fetch lyrics right now.",
    });
  }
};
