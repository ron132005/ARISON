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

const fbApi = axios.create({
  baseURL: "https://graph.facebook.com/v23.0/me/messages",
  params: { access_token: PAGE_ACCESS_TOKEN },
});

// --- Messenger Profile Configuration (Get Started Button) ---
async function setMessengerProfile() {
  try {
    await axios.post(
      `https://graph.facebook.com/v23.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        get_started: {
          payload: "GET_STARTED_PAYLOAD"
        },
        commands: [
          {
            locale: "default",
            commands: [
              { name: "/help", description: "Show all available commands" },
              { name: "/song", description: "Find and download music" },
              { name: "/mcu", description: "See the next Marvel movie countdown" },
              { name: "/owner", description: "Information about the developer" },
              { name: "/menu", description: "Show the interactive quick menu" }
            ]
          }
        ],
        persistent_menu: [
          {
            locale: "default",
            composer_input_disabled: false,
            call_to_actions: [
              {
                type: "postback",
                title: "📜 Help",
                payload: "HELP_PAYLOAD",
              },
              {
                type: "postback",
                title: "👤 View Owner",
                payload: "OWNER_PAYLOAD",
              },
            ],
          },
        ],
      }
    );
    console.log("✅ Get Started button & Messenger Profile updated");
  } catch (err) {
    console.error("❌ Profile Error:", err.response?.data || err.message);
  }
}

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

      const senderId = webhook_event.sender?.id;
      const messageMid = webhook_event.message?.mid;

      if (webhook_event.postback) {
        handlePayload(senderId, webhook_event.postback.payload, messageMid);
      }

      if (webhook_event?.message?.quick_reply?.payload) {
        handlePayload(senderId, webhook_event.message.quick_reply.payload, messageMid);
      }

      if (webhook_event?.message?.text) {
        handleMessage(senderId, webhook_event.message.text, messageMid);
      }
    });
    return res.status(200).send("EVENT_RECEIVED");
  }
  res.sendStatus(404);
});

// --- Shared Payload Handler ---
function handlePayload(senderId, payload, messageMid) {
  switch (payload) {
    case "GET_STARTED_PAYLOAD":
      return callSendAPI(
        senderId, 
        { text: "Welcome! 👋 Click the button below to get started or type /help to see what I can do." }, 
        messageMid
      );

    case "HELP_PAYLOAD":
      return helpCommand(senderId, (psid, msg) => callSendAPI(psid, msg, messageMid));

    case "OWNER_PAYLOAD":
      return ownerCommand(senderId, (psid, msg) => callSendAPI(psid, msg, messageMid));

    case "MCU_PAYLOAD":
      return mcuCommand(senderId, (psid, msg) => callSendAPI(psid, msg, messageMid));

    case "SONG_PAYLOAD":
      return callSendAPI(senderId, { text: "🎵 Please type the song name. Example: /song Manchild" }, messageMid);
  }
}

// --- Logic Router ---
async function handleMessage(psid, text, mid) {
  await Promise.all([
    sendAction(psid, "mark_seen"),
    sendAction(psid, "typing_on"),
  ]).catch((err) => console.error("Action Error:", err.message));

  const input = text.toLowerCase().trim();

  if (input === "/menu") {
    return callSendAPI(psid, {
      text: "Pick an option:",
      quick_replies: [
        { content_type: "text", title: "HELP", payload: "HELP_PAYLOAD" },
        { content_type: "text", title: "OWNER", payload: "OWNER_PAYLOAD" },
        { content_type: "text", title: "MCU", payload: "MCU_PAYLOAD" },
        { content_type: "text", title: "SONG", payload: "SONG_PAYLOAD" }, 
      ],
    }, mid);
  }

  if (input === "/help") return helpCommand(psid, (id, msg) => callSendAPI(id, msg, mid));
  if (input === "/test") return testCommand(psid, (id, msg) => callSendAPI(id, msg, mid));
  if (input === "/owner") return ownerCommand(psid, (id, msg) => callSendAPI(id, msg, mid));
  if (input === "/mcu") return mcuCommand(psid, (id, msg) => callSendAPI(id, msg, mid));
  if (input === "hi" || input === "hello") return callSendAPI(psid, { text: "Hello!" }, mid);

  if (input.startsWith("/song")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query) return callSendAPI(psid, { text: "Please provide a song name." }, mid);
    return songCommand(psid, (id, msg) => callSendAPI(id, msg, mid), query);
  }

  if (input.startsWith("/lyrics")) {
    const query = text.split(" ").slice(1).join(" ");
    if (!query) return callSendAPI(psid, { text: "Please provide a song name." }, mid);
    return lyricsCommand(psid, (id, msg) => callSendAPI(id, msg, mid), query);
  }

  if (input.includes("tiktok.com")) return tiktokCommand(psid, (id, msg) => callSendAPI(id, msg, mid), text);

  return mistralCommand(psid, (id, msg) => callSendAPI(id, msg, mid), text);
}

// --- API Helpers ---
async function sendAction(psid, action) {
  return fbApi.post("", { recipient: { id: psid }, sender_action: action });
}

async function callSendAPI(psid, response, replyMid = null) {
  try {
    if (response.filedata) {
      const form = new FormData();
      form.append("recipient", JSON.stringify({ id: psid }));
      form.append("message", JSON.stringify({ attachment: { type: response.attachment.type, payload: {} } }));
      form.append("messaging_type", "RESPONSE");
      if (replyMid) form.append("reply_to", JSON.stringify({ mid: replyMid }));
      form.append("filedata", fs.createReadStream(response.filedata));

      await axios.post(`https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, form, { headers: form.getHeaders() });
    } else {
      await fbApi.post("", {
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: response,
        ...(replyMid && { reply_to: { mid: replyMid } }),
      });
    }
  } catch (err) {
    console.error("Send Error:", JSON.stringify(err.response?.data, null, 2) || err.message);
  }
}

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => {
  console.log(`🚀 Webhook live on ${PORT}`);
  setMessengerProfile();
});

