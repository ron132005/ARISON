// Example test.js
module.exports = (sender_psid, callSendAPI) => {
  callSendAPI(sender_psid, { text: "This is the test command!" });
};
