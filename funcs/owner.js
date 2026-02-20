const path = require("path");

module.exports = (sender_psid, callSendAPI) => {
  // Text first
  callSendAPI(sender_psid, {
    text:
      "Owner: Ron Funiestas\n" +
      "Current Date: " + new Date().toLocaleDateString() + "\n" +
      "About: This AI is named ARISON, designed to help with questions and queries.\n" +
      "Contact Me: https://www.facebook.com/ron.funiestas/",
  }).then(() => {
    // Then send GIF
    callSendAPI(sender_psid, {
      attachment: { type: "image", payload: {} },
      filedata: path.join(__dirname, "..", "res", "owner.gif"), // main directory
    });
  });
};
