const fs = require("fs");
const path = require("path");

module.exports = (sender_psid, callSendAPI) => {
  // 1️⃣ Send text first
  const textMessage = {
    text: 
      "Owner: Ron Funiestas\n" +
      "Current Date: " + new Date().toLocaleDateString() + "\n" +
      "About: This AI is named ARISON, designed to help with questions and queries.\n" +
      "Contact Me: https://www.facebook.com/ron.funiestas/"
  };

  callSendAPI(sender_psid, textMessage, async () => {
    // 2️⃣ Send GIF
    const gifPath = path.join(__dirname, "..", "res", "owner.gif");

    // Check if the file exists
    if (!fs.existsSync(gifPath)) {
      return console.error("GIF file not found:", gifPath);
    }

    // Messenger requires file uploads via FormData
    const gifMessage = {
      attachment: { type: "image", payload: {} },
      filedata: gifPath
    };

    try {
      await callSendAPI(sender_psid, gifMessage);
    } catch (err) {
      console.error("Failed to send GIF:", err);
    }
  });
};
