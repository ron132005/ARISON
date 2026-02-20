const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

/** * IMPORTANT: Ensure these files exist in a folder named 'funcs' relative to this script. 
 */
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
const PAGE_ACCESS_TOKEN = "EAAUyQ2YrkywBQ3LHXLip0fTynkXnKg56iDUqm1RRpF5f3hVBPcwi1mksKBhrB5vmZCUVfORjkkDGZCSHCtmMZB0zKoWkBeHyNCBZCj8XCcVDU4VSW1WmE3WsjYGrcJ29E4PZB2goe8wpN05PTTSmIGHcL33VqpSY4upUuXc2ixryrbqEINCUFPFFvfnuibuaiIqOSPAZDZD";
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
      if (!webhook_event) return;

      const psid = webhook_event.sender.id;
      const messageId = webhook_event.message?.mid; // Capture the message ID to reply to

      // Quick Reply handler
      if (webhook_event.message?.quick_reply?.payload) {
        const payload = webhook_event.message.quick_reply.payload;
        // Wrap callSendAPI to include the specific message ID
        const replyWrapper = (id, resp) => callSendAPI(id, resp, messageId);

        switch (payload) {
          case "HELP_PAYLOAD": return helpCommand(psid, replyWrapper);
          case "OWNER_PAYLOAD": return ownerCommand(psid, replyWrapper);
          case "MCU_PAYLOAD": return mcuCommand(psid, replyWrapper);
        }
      }

      // Normal text messages
      if (webhook_event.message?.text) {
        handleMessage(psid, webhook_event.message.text, messageId);
      }
    });
    return res.status(200).send("EVENT_RECEIVED");
  }
  res.sendStatus(404);
});

// --- Logic Router ---
async function handleMessage(psid, text, mid) {
  // Show typing indicator
  await Promise.all([
    sendAction(psid, "mark_seen"), 
    sendAction(psid, "typing_on")
  ]).catch(err => console.error("Action Error:", err.message));

  const input = text.toLowerCase().trim();

  /**
   * Helper function: Automatically attaches the 'mid' (reply_to) 
   * so your command files don't need to change their logic.
   */
  const reply = (response) => callSendAPI(psid, response, mid);

  // --- /menu Quick Replies ---
  if (input === "/menu") {
    return reply({
      text: "Here’s a selection of things I can help you with:",
      quick_replies: [
        { content_type: "text", title: "Help", payload: "HELP_PAYLOAD" },
        { content_type: "text", title: "Owner Details", payload: "OWNER_PAYLOAD" },
        { content_type: "text", title: "MCU Countdown", payload: "MCU_PAYLOAD" },
      ],
    });
  }

  // --- Exact Matches ---
  if (input === "/help") return helpCommand(psid, reply);
  if (input === "/test") return testCommand(psid, reply);
  if (input === "/owner") return ownerCommand(psid, reply);
  if (input === "/mcu") return mcuCommand(psid, reply);
  if (input === "hi" || input === "hello") return reply({ text: "Hello!" });

  // --- Commands with arguments ---
  if (input.startsWith("/song")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query) return reply({ text: "Please provide a song name. Example: /song edamame" });
    return songCommand(psid, reply, query);
  }

  if (input.startsWith("/lyrics")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query) return reply({ text: "Please provide a song name. Example: /lyrics edamame" });
    return lyricsCommand(psid, reply, query);
  }

  // --- Fallback AI ---
  return mistralCommand(psid, reply, text);
}

// --- API Helpers ---
async function sendAction(psid, action) {
  return fbApi.post("", { recipient: { id: psid }, sender_action: action });
}

async function callSendAPI(psid, response, mid = null) {
  try {
    // If a Message ID (mid) is provided, add the reply_to property
    if (mid && typeof response === 'object') {
      response.reply_to = { message_id: mid };
    }

    // Case 1: Sending a local file (Attachment)
    if (response.filedata) {
      const form = new FormData();
      form.append("recipient", JSON.stringify({ id: psid }));
      
      const messagePayload = {
        attachment: { type: response.attachment.type, payload: {} }
      };
      
      // Include reply functionality for files
      if (mid) messagePayload.reply_to = { message_id: mid };

      form.append("message", JSON.stringify(messagePayload));
      form.append("filedata", fs.createReadStream(response.filedata));

      await axios.post(
        `https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form,
        { headers: form.getHeaders() }
      );
    } 
    // Case 2: Standard text or structured template
    else {
      await fbApi.post("", { 
        recipient: { id: psid }, 
        messaging_type: "RESPONSE",
        message: response 
      });
    }
  } catch (err) {
    console.error("Send Error Details:", JSON.stringify(err.response?.data, null, 2) || err.message);
  }
}

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`🚀 Webhook live on ${PORT}`));
