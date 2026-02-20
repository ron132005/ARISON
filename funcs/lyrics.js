const Genius = require("genius-lyrics");
const Client = new Genius.Client();

module.exports = async (sender_psid, callSendAPI, messageText) => {
  // 1. Extract the query (handling the /lyrics or lyrics command)
  const query = messageText.split(" ").slice(1).join(" ").trim();

  if (!query) {
    return callSendAPI(sender_psid, { text: "⚠️ Usage: /lyrics [song name]" });
  }

  try {
    // 2. Search for the song
    const searches = await Client.songs.search(query);

    if (!searches || searches.length === 0) {
      return callSendAPI(sender_psid, { text: `ℹ️ No lyrics found for "${query}".` });
    }

    // 3. Get lyrics from the first result
    const firstSong = searches[0];
    const lyrics_full = await firstSong.lyrics();
    
    // Cleaning the lyrics (removing metadata headers if they exist)
    const lyrics = lyrics_full.includes("[") 
      ? lyrics_full.substring(lyrics_full.indexOf("[")) 
      : lyrics_full;

    // 4. Handle Messenger Character Limits
    // We limit to 3500 chars to avoid "Message too long" errors
    const cleanLyrics = lyrics.length > 3500 
      ? lyrics.slice(0, 3500) + "\n\n(Truncated...)" 
      : lyrics;

    // 5. Send to user
    await callSendAPI(sender_psid, { 
      text: `🎵 𝗟𝘆𝗿𝗶𝗰𝘀: ${firstSong.title}\n\n${cleanLyrics}` 
    });

  } catch (err) {
    console.error("Lyrics Error:", err);
    callSendAPI(sender_psid, { text: "❌ Error: Unable to fetch lyrics." });
  }
};
