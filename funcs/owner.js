const path = require("path");

module.exports = (sender_psid, callSendAPI) => {
  const textMessage = {
    text: 
      "Owner: Ron Funiestas\n" +
      "Current Date: " + new Date().toLocaleDateString() + "\n" +
      "About: This AI is named ARISON, designed to help with questions and queries.\n" +
      "Contact Me: https://www.facebook.com/ron.funiestas/"
  };

  callSendAPI(sender_psid, textMessage, () => {
    const gifMessage = {
      attachment: {
        type: "image",
        payload: {}
      },
      filedata: path.join(__dirname, "..", "res", "owner.gif")
    };

    callSendAPI(sender_psid, gifMessage);
  });
};
