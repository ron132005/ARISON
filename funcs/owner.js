const path = require("path");

module.exports = (sender_psid, callSendAPI) => {
  // Text first
  callSendAPI(sender_psid, {
    text:
      "ᴏᴡɴᴇʀ: Ron Funiestas\n" +
      "ᴄᴜʀʀᴇɴᴛ ᴅᴀᴛᴇ: " + new Date().toLocaleDateString() + "\n" +
      "ᴀʙᴏᴜᴛ: ARISON is an AI designed to assist with questions and inquiries, with its name standing for 𝐀utonomous, 𝐑esponsive, 𝐈ntelligent 𝐒ystems for 𝐎ptimized 𝐍etworking. It represents an advanced framework built to deliver precision, efficiency, and control in complex operational environments, enabling streamlined support and intelligent responses.\n\n" +
      "ᴄᴏɴᴛᴀᴄᴛ ᴍᴇ: https://www.facebook.com/ron.funiestas/",
  }).then(() => {
    // Then send GIF
    callSendAPI(sender_psid, {
      attachment: { type: "image", payload: {} },
      filedata: path.join(__dirname, "..", "res", "owner.gif"), // main directory
    });
  });
};
