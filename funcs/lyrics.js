const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (sender_psid, callSendAPI, messageText) => {
  const query = messageText.split(" ").slice(1).join(" ").trim();

  if (!query) {
    return callSendAPI(sender_psid, { text: "⚠️ Usage: /lyrics [song name]" });
  }

  try {
    // 1. Search for the song URL on Google or Genius directly
    // Using a search proxy or direct Genius search
    const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}&access_token=YOUR_GENIUS_TOKEN_IF_YOU_HAVE_ONE`;
    
    // NOTE: If you truly want NO API, we use a public search scraper:
    const geniusSearch = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query + " genius lyrics")}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $search = cheerio.load(geniusSearch.data);
    const songUrl = $search("a[href*='genius.com']").first().attr("href")?.split("?q=")[1]?.split("&")[0] 
                    || $search("a[href*='genius.com']").first().attr("href");

    if (!songUrl || !songUrl.includes("genius.com")) {
      return callSendAPI(sender_psid, { text: `ℹ️ Could not find lyrics for "${query}".` });
    }

    // 2. Scrape the lyrics from the found URL
    const { data } = await axios.get(decodeURIComponent(songUrl));
    const $ = cheerio.load(data);

    // Genius stores lyrics in several containers depending on the version of the site
    let lyrics = "";
    $('[class^="Lyrics__Container"], .lyrics').each((i, el) => {
      if ($(el).text().length > 0) {
        // Replace <br> tags with newlines and clean up
        $(el).find('br').replaceWith('\n');
        lyrics += $(el).text() + "\n";
      }
    });

    if (!lyrics) throw new Error("Lyrics container not found");

    // 3. Clean up the text
    const cleanLyrics = lyrics.replace(/\[.*?\]/g, "").trim(); // Removes [Chorus], [Verse], etc.
    const finalResult = cleanLyrics.length > 3500 ? cleanLyrics.slice(0, 3500) + "..." : cleanLyrics;

    await callSendAPI(sender_psid, { text: `🎵 𝗟𝘆𝗿𝗶𝗰𝘀:\n\n${finalResult}` });

  } catch (err) {
    console.error("Scraping Error:", err.message);
    callSendAPI(sender_psid, { text: "❌ Error: Unable to fetch lyrics. The site might be blocking the request." });
  }
};
