
const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

/** * IMPORTANT: Ensure these files exist in a folder named 'funcs' relative to this script. */
const helpCommand = require("./funcs/help.js");
const testCommand = require("./funcs/test.js");
const mistralCommand = require("./funcs/mistral.js");
const songCommand = require("./funcs/song.js");
const tiktokCommand = require("./funcs/tiktok.js");
const lyricsCommand = require("./funcs/lyrics.js");
const ownerCommand = require("./funcs/owner.js");
const mcuCommand = require("./funcs/mcu.js");

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

// --- Webhook verification ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.set("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// --- Webhook message handler ---
app.post("/webhook", (req, res) => {
  const { body } = req;
  if (body.object === "page") {
    body.entry.forEach((entry) => {
      const webhook_event = entry.messaging?.[0];

      // Quick Reply handler
      if (webhook_event?.message?.quick_reply?.payload) {
        const payload = webhook_event.message.quick_reply.payload;
        switch (payload) {
          case "HELP_PAYLOAD":
            return helpCommand(webhook_event.sender.id, callSendAPI);
          case "OWNER_PAYLOAD":
            return ownerCommand(webhook_event.sender.id, callSendAPI);
          case "MCU_PAYLOAD":
            return mcuCommand(webhook_event.sender.id, callSendAPI);
          case "SONG_PAYLOAD":
            return songCommand(webhook_event.sender.id, callSendAPI);
        }
      }

      // Normal text messages
      if (webhook_event?.message?.text) {
        handleMessage(webhook_event.sender.id, webhook_event.message.text);
      }
    });
    return res.status(200).send("EVENT_RECEIVED");
  }
  res.sendStatus(404);
});

// --- Logic Router ---
async function handleMessage(psid, text) {
  await Promise.all([sendAction(psid, "mark_seen"), sendAction(psid, "typing_on")]).catch(
    (err) => console.error("Action Error:", err.message)
  );

  const input = text.toLowerCase().trim();

  // --- /menu Quick Replies ---
  if (input === "/menu") {
    return callSendAPI(psid, {
      text: "Here’s a selection of things I can help you with. Pick an option from the list below:",
      quick_replies: [
        { content_type: "text", title: "Help", payload: "HELP_PAYLOAD" },
        { content_type: "text", title: "Owner Details", payload: "OWNER_PAYLOAD" },
        { content_type: "text", title: "MCU Countdown", payload: "MCU_PAYLOAD" },
        { content_type: "text", title: "Song", payload: "SONG_PAYLOAD" },
      ],
    });
  }

  // --- Exact Matches ---
  if (input === "/help") return helpCommand(psid, callSendAPI);
  if (input === "/test") return testCommand(psid, callSendAPI);
  if (input === "/owner") return ownerCommand(psid, callSendAPI);
  if (input === "/mcu") return mcuCommand(psid, callSendAPI);
  if (input === "hi" || input === "hello") return callSendAPI(psid, { text: "Hello!" });

  // --- Commands with arguments ---
  if (input.startsWith("/song")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query) return callSendAPI(psid, { text: "Please provide a song name. Example: /song edamame" });
    return songCommand(psid, callSendAPI, query);
  }

  if (input.startsWith("/lyrics")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query) return callSendAPI(psid, { text: "Please provide a song name. Example: /lyrics edamame" });
    return lyricsCommand(psid, callSendAPI, query);
  }

  // --- TikTok (disabled example) ---
  if (input.includes("tiktok.comDISABLED")) {
    return tiktokCommand(psid, callSendAPI, text);
  }

  // --- Fallback AI ---
  return mistralCommand(psid, callSendAPI, text);
}

// --- API Helpers ---
async function sendAction(psid, action) {
  return fbApi.post("", { recipient: { id: psid }, sender_action: action });
}

async function callSendAPI(psid, response) {
  try {
    // Send local file
    if (response.filedata) {
      const form = new FormData();
      form.append("recipient", JSON.stringify({ id: psid }));
      form.append(
        "message",
        JSON.stringify({
          attachment: { type: response.attachment.type, payload: {} },
        })
      );
      form.append("filedata", fs.createReadStream(response.filedata));

      await axios.post(
        "https://graph.facebook.com/v12.0/me/messages?access_token=" + PAGE_ACCESS_TOKEN,
        form,
        { headers: form.getHeaders() }
      );
    } else {
      // Send normal text or template
      await fbApi.post("", { recipient: { id: psid }, message: response });
    }
  } catch (err) {
    console.error("Send Error:", JSON.stringify(err.response?.data, null, 2) || err.message);
  }
}
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`🚀 Webhook live on ${PORT}`));


