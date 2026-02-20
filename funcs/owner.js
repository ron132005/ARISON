const path = require("path");

module.exports = (sender_psid, callSendAPI) => {
  // 1️⃣ Text message
  const textMessage = {
    text: 
      "Owner: Ron Funiestas\n" +
      "Current Date: " + new Date().toLocaleDateString() + "\n" +
      "About: This AI is named ARISON, designed to help with questions and queries.\n" +
      "Contact Me: https://www.facebook.com/ron.funiestas/"
  };

  // Send text first
  callSendAPI(sender_psid, textMessage, () => {
    // 2️⃣ Then send GIF
    const gifMessage = {
      attachment: {
        type: "image", // or "video" if it's a GIF in MP4 format
        payload: {}
      },
      filedata: path.join(__dirname, "res", "owner.gif") // make sure the file is a real GIF
    };

    callSendAPI(sender_psid, gifMessage);
  });
};
