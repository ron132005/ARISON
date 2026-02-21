const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const app = express().use(express.json());

// =============================
// 🔐 HARDCODED TOKENS
// =============================
const PAGE_ACCESS_TOKEN =
  "EAAUyQ2YrkywBQ3LHXLip0fTynkXnKg56iDUqm1RRpF5f3hVBPcwi1mksKBhrB5vmZCUVfORjkkDGZCSHCtmMZB0zKoWkBeHyNCBZCj8XCcVDU4VSW1WmE3WsjYGrcJ29E4PZB2goe8wpN05PTTSmIGHcL33VqpSY4upUuXc2ixryrbqEINCUFPFFvfnuibuaiIqOSPAZDZD";

const VERIFY_TOKEN = "getroned";

// =============================
// 📡 AXIOS INSTANCE (v23.0)
// =============================
const fbApi = axios.create({
  baseURL: "https://graph.facebook.com/v23.0/me/messages",
  params: { access_token: PAGE_ACCESS_TOKEN },
});

// =============================
// 🔎 WEBHOOK VERIFICATION
// =============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// =============================
// 📥 WEBHOOK EVENT RECEIVER
// =============================
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        const senderId = event.sender.id;
        const message = event.message;

        if (!message) return;

        const mid = message.mid; // 🔥 MESSAGE ID FOR REPLY

        // Quick Replies
        if (message.quick_reply?.payload) {
          return handleQuickReply(senderId, message.quick_reply.payload, mid);
        }

        // Normal Text
        if (message.text) {
          return handleMessage(senderId, message.text, mid);
        }
      });
    });

    return res.status(200).send("EVENT_RECEIVED");
  }

  res.sendStatus(404);
});

// =============================
// 🧠 MESSAGE HANDLER
// =============================
async function handleMessage(psid, text, mid) {
  await sendAction(psid, "mark_seen");
  await sendAction(psid, "typing_on");

  const input = text.toLowerCase().trim();

  if (input === "hi" || input === "hello") {
    return callSendAPI(psid, { text: "Hello there 👋" }, mid);
  }

  if (input === "/menu") {
    return callSendAPI(
      psid,
      {
        text: "Choose an option below:",
        quick_replies: [
          { content_type: "text", title: "Help", payload: "HELP" },
          { content_type: "text", title: "Owner", payload: "OWNER" },
        ],
      },
      mid
    );
  }

  if (input === "/help") {
    return callSendAPI(psid, { text: "Type /menu to see commands." }, mid);
  }

  return callSendAPI(psid, { text: "I received: " + text }, mid);
}

// =============================
// ⚡ QUICK REPLY HANDLER
// =============================
async function handleQuickReply(psid, payload, mid) {
  if (payload === "HELP") {
    return callSendAPI(psid, { text: "This is the help section." }, mid);
  }

  if (payload === "OWNER") {
    return callSendAPI(psid, { text: "Bot created by you 😎" }, mid);
  }
}

// =============================
// 📤 SEND API WITH REPLY SUPPORT
// =============================
async function callSendAPI(psid, response, replyMid = null) {
  try {
    // If sending local file
    if (response.filedata) {
      const form = new FormData();

      form.append("recipient", JSON.stringify({ id: psid }));

      form.append(
        "message",
        JSON.stringify({
          attachment: {
            type: response.attachment.type,
            payload: {},
          },
        })
      );

      if (replyMid) {
        form.append("reply_to", JSON.stringify({ mid: replyMid }));
        form.append("messaging_type", "RESPONSE");
      }

      form.append("filedata", fs.createReadStream(response.filedata));

      await axios.post(
        `https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form,
        { headers: form.getHeaders() }
      );

      return;
    }

    // Normal Text / Template
    await fbApi.post("", {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: response,
      ...(replyMid && { reply_to: { mid: replyMid } }),
    });

  } catch (error) {
    console.error(
      "❌ SEND ERROR:",
      error.response?.data || error.message
    );
  }
}

// =============================
// 👀 SENDER ACTIONS
// =============================
async function sendAction(psid, action) {
  try {
    await fbApi.post("", {
      recipient: { id: psid },
      sender_action: action,
    });
  } catch (err) {
    console.error("Action Error:", err.response?.data || err.message);
  }
}

// =============================
// ❤️ HEALTH CHECK
// =============================
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// =============================
// 🚀 START SERVER
// =============================
const PORT = process.env.PORT || 1337;
app.listen(PORT, () => console.log(`🚀 Webhook live on port ${PORT}`));
