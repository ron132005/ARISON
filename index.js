const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

/** Ensure these files exist in a folder named 'funcs' relative to this script */
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
  baseURL: "https://graph.facebook.com/v25.0/me/messages",
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
      const message_id = webhook_event?.message?.mid;

      // Quick Reply handler
      if (webhook_event?.message?.quick_reply?.payload) {
        const payload = webhook_event.message.quick_reply.payload;
        switch (payload) {
          case "HELP_PAYLOAD":
            return helpCommand(webhook_event.sender.id, (resp) =>
              callSendAPI(webhook_event.sender.id, resp, message_id)
            );
          case "OWNER_PAYLOAD":
            return ownerCommand(webhook_event.sender.id, (resp) =>
              callSendAPI(webhook_event.sender.id, resp, message_id)
            );
          case "MCU_PAYLOAD":
            return mcuCommand(webhook_event.sender.id, (resp) =>
              callSendAPI(webhook_event.sender.id, resp, message_id)
            );
          case "TEST_PAYLOAD":
            return testCommand(webhook_event.sender.id, (resp) =>
              callSendAPI(webhook_event.sender.id, resp, message_id)
            );
        }
      }

      // Normal text messages
      if (webhook_event?.message?.text) {
        handleMessage(webhook_event.sender.id, webhook_event.message.text, message_id);
      }
    });
    return res.status(200).send("EVENT_RECEIVED");
  }
  res.sendStatus(404);
});

// --- Logic Router ---
async function handleMessage(psid, text, message_id) {
  await Promise.all([sendAction(psid, "mark_seen"), sendAction(psid, "typing_on")]).catch(
    (err) => console.error("Action Error:", err.message)
  );

  const input = text.toLowerCase().trim();

  // --- /menu Quick Replies ---
  if (input === "/menu") {
    return callSendAPI(
      psid,
      {
        text: "Here’s a selection of things I can help you with. Pick an option from the list below:",
        quick_replies: [
          { content_type: "text", title: "Help", payload: "HELP_PAYLOAD" },
          { content_type: "text", title: "Owner Details", payload: "OWNER_PAYLOAD" },
          { content_type: "text", title: "MCU Countdown", payload: "MCU_PAYLOAD" },
          { content_type: "text", title: "Test", payload: "TEST_PAYLOAD" },
        ],
      },
      message_id
    );
  }

  // --- Exact Matches ---
  if (input === "/help") return helpCommand(psid, (resp) => callSendAPI(psid, resp, message_id));
  if (input === "/test") return testCommand(psid, (resp) => callSendAPI(psid, resp, message_id));
  if (input === "/owner") return ownerCommand(psid, (resp) => callSendAPI(psid, resp, message_id));
  if (input === "/mcu") return mcuCommand(psid, (resp) => callSendAPI(psid, resp, message_id));
  if (input === "hi" || input === "hello")
    return callSendAPI(psid, { text: "Hello!" }, message_id);

  // --- Commands with arguments ---
  if (input.startsWith("/song")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query)
      return callSendAPI(
        psid,
        { text: "Please provide a song name. Example: /song edamame" },
        message_id
      );
    return songCommand(psid, (resp) => callSendAPI(psid, resp, message_id), query);
  }

  if (input.startsWith("/lyrics")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query)
      return callSendAPI(
        psid,
        { text: "Please provide a song name. Example: /lyrics edamame" },
        message_id
      );
    return lyricsCommand(psid, (resp) => callSendAPI(psid, resp, message_id), query);
  }

  // --- TikTok (disabled example) ---
  if (input.includes("tiktok.comDISABLED")) {
    return tiktokCommand(psid, (resp) => callSendAPI(psid, resp, message_id), text);
  }

  // --- Fallback AI ---
  return mistralCommand(psid, (resp) => callSendAPI(psid, resp, message_id), text);
}

// --- API Helpers ---
async function sendAction(psid, action) {
  return fbApi.post("", { recipient: { id: psid }, sender_action: action });
}

async function callSendAPI(psid, response, reply_to_mid = null) {
  try {
    const payload = {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: response,
    };

    if (reply_to_mid) {
      payload.message.reply_to = { mid: reply_to_mid };
    }

    // Send local file if present
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
        `https://graph.facebook.com/v25.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form,
        { headers: form.getHeaders() }
      );
    } else {
      await fbApi.post("", payload);
    }
  } catch (err) {
    console.error("Send Error:", JSON.stringify(err.response?.data, null, 2) || err.message);
  }
}

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`🚀 Webhook live on ${PORT}`));

