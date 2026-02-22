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
  "/help - open this help message\n/developer - check the bot's developer\n/menu - check commands via quick replies\n/mcu - check the next MCU movie\n/song - find and send song\n/lyrics - find and send song lyrics",
  
  "/help - show help info\n/developer - see who made this bot\n/menu - browse all commands quickly\n/mcu - get info on the next MCU movie\n/song - search and send a song\n/lyrics - fetch song lyrics",
  
  "/help - access help message\n/developer - bot developer info\n/menu - quick commands list\n/mcu - next MCU movie details\n/song - find and send music\n/lyrics - get lyrics for a song",
  
  "/help - open help instructions\n/developer - learn about the bot creator\n/menu - explore commands through quick replies\n/mcu - upcoming MCU movie info\n/song - search and send songs\n/lyrics - retrieve song lyrics",
  
  "/help - display help message\n/developer - info about the developer\n/menu - see commands with quick replies\n/mcu - check next MCU movie\n/song - find and deliver songs\n/lyrics - get song lyrics",
  
  "/help - get help message\n/developer - who made me\n/menu - list all commands\n/mcu - upcoming MCU movie info\n/song - search and send a song\n/lyrics - lyrics of a song",
  
  "/help - open the help guide\n/developer - know the developer\n/menu - view commands via quick replies\n/mcu - next MCU movie schedule\n/song - search for songs\n/lyrics - fetch lyrics",
  
  "/help - see help message\n/developer - check bot developer\n/menu - quick access to commands\n/mcu - info on next MCU movie\n/song - find & send song\n/lyrics - get song lyrics",
  
  "/help - help commands\n/developer - developer info\n/menu - all commands in one place\n/mcu - next MCU movie details\n/song - search songs\n/lyrics - find lyrics",
  
  "/help - help menu\n/developer - who developed this bot\n/menu - commands via quick replies\n/mcu - next MCU movie info\n/song - find songs to send\n/lyrics - fetch song lyrics"
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

