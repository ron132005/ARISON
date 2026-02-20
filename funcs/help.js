// help.js
module.exports = (sender_psid, callSendAPI) => {
  // Arrays of possible phrases
  const firstMessages = [
    "Are you confused?",
    "Need some guidance?",
    "Lost in the commands?",
    "Feeling stuck?",
    "Need a little help?"
  ];

  const secondMessages = [
    "Type /menu to see all available commands!",
    "Use /menu to check what you can do!",
    "Try /menu to get a list of commands!",
    "Want to see commands? Just type /menu!",
    "Check /menu to see your options!"
  ];

  // Pick random phrases
  const firstMessage = firstMessages[Math.floor(Math.random() * firstMessages.length)];
  const secondMessage = secondMessages[Math.floor(Math.random() * secondMessages.length)];

  // Send first message
  callSendAPI(sender_psid, { text: firstMessage });

  // Send second message after 1 second
  setTimeout(() => {
    callSendAPI(sender_psid, { text: secondMessage });
  }, 1000);
};
