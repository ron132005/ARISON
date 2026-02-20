
const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

/** * IMPORTANT: Ensure these files exist in a folder named 'funcs'
 * relative to this script.
 */
const helpCommand = require("./funcs/help.js");
const testCommand = require("./funcs/test.js");
const mistralCommand = require("./funcs/mistral.js");
const songCommand = require("./funcs/song.js");
const tiktokCommand = require("./funcs/tiktok.js");
const lyricsCommand = require("./funcs/lyrics.js");

const app = express().use(express.json());

// --- TOKENS ---
const PAGE_ACCESS_TOKEN =
  "EAAUyQ2YrkywBQ3LHXLip0fTynkXnKg56iDUqm1RRpF5f3hVBPcwi1mksKBhrB5vmZCUVfORjkkDGZCSHCtmMZB0zKoWkBeHyNCBZCj8XCcVDU4VSW1WmE3WsjYGrcJ29E4PZB2goe8wpN05PTTSmIGHcL33VqpSY4upUuXc2ixryrbqEINCUFPFFvfnuibuaiIqOSPAZDZD";
const VERIFY_TOKEN = "getroned";

// Pre-configure axios
const fbApi = axios.create({
  baseURL: "https://graph.facebook.com/v12.0/me/messages",
  params: { access_token: PAGE_ACCESS_TOKEN },
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");

    // Explicitly set the status and content type to text/plain
    res.set("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// 2. Message Handling
app.post("/webhook", (req, res) => {
  const { body } = req;
  if (body.object === "page") {
    body.entry.forEach((entry) => {
      const webhook_event = entry.messaging?.[0];
      if (webhook_event?.message?.text) {
        handleMessage(webhook_event.sender.id, webhook_event.message.text);
      }
    });
    return res.status(200).send("EVENT_RECEIVED");
  }
  res.sendStatus(404);
});

// 3. Logic Router
async function handleMessage(psid, text) {
  // Fire indicators (Seen/Typing)
  Promise.all([
    sendAction(psid, "mark_seen"),
    sendAction(psid, "typing_on"),
  ]).catch((err) => console.error("Action Error:", err.message));

  const input = text.toLowerCase().trim();

  // --- ROUTING LOGIC ---

  // 0. Always running commands
  if (input.includes("tiktok.com")) {
    // Calls the required tiktokCommand from ./funcs/tiktok.js
    return tiktokCommand(psid, callSendAPI, text);
  }

  // 1. Exact Matches
  if (input === "/help") return helpCommand(psid, callSendAPI);
  if (input === "/test") return testCommand(psid, callSendAPI);
  if (input === "hi" || input === "hello")
    return callSendAPI(psid, { text: "Hello!" });

  // 2. Starts With Matches (For commands with arguments like /song edamame)
  if (input.startsWith("/song")) {
    // Splits by space, removes the "/song" part, and joins the rest as the song title
    const query = text.split(" ").slice(1).join(" ");

    if (!query) {
      return callSendAPI(psid, {
        text: "Please provide a song name. Example: /song edamame",
      });
    }

    // Calls the required songCommand from ./funcs/song.js
    return songCommand(psid, callSendAPI, query);
  }

  // 3. Fallback (If no command matches, use AI)
  return mistralCommand(psid, callSendAPI, text);
}

if (input.startsWith("/lyrics")) {
    // Splits by space, removes the "/song" part, and joins the rest as the song title
    const query = text.split(" ").slice(1).join(" ");

    if (!query) {
      return callSendAPI(psid, {
        text: "Please provide a song name. Example: /lyrics edamame",
      });
    }

    // Calls the required songCommand from ./funcs/song.js
    return lyricsCommand(psid, callSendAPI, query);
  }

  // 3. Fallback (If no command matches, use AI)
  return mistralCommand(psid, callSendAPI, text);
}

// 4. API Helpers
async function sendAction(psid, action) {
  return fbApi.post("", {
    recipient: { id: psid },
    sender_action: action,
  });
}

async function callSendAPI(psid, response) {
  try {
    let payload;
    let headers = {};

    // 1. If sending a local file (e.g., MP3/MP4)
    if (response.filedata) {
      const form = new FormData();
      form.append("recipient", JSON.stringify({ id: psid }));

      // FIX: We must wrap the type/payload inside an 'attachment' object
      const messagePayload = {
        attachment: {
          type: response.attachment.type,
          payload: {}, // Payload is empty because the file is in 'filedata'
        },
      };

      form.append("message", JSON.stringify(messagePayload));
      form.append("filedata", fs.createReadStream(response.filedata));

      payload = form;
      headers = form.getHeaders();
    }
    // 2. If sending standard text or generic templates
    else {
      payload = {
        recipient: { id: psid },
        message: response,
      };
    }

    await fbApi.post("", payload, { headers });
  } catch (err) {
    // Stringify the error so you can see the full Facebook explanation
    console.error(
      "Send Error:",
      JSON.stringify(err.response?.data, null, 2) || err.message,
    );
  }
}

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`🚀 Webhook live on ${PORT}`));

