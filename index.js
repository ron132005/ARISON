const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const helpCommand = require("./funcs/help.js");
const testCommand = require("./funcs/test.js");
const mistralCommand = require("./funcs/mistral.js");
const songCommand = require("./funcs/song.js");
const tiktokCommand = require("./funcs/tiktok.js");
const lyricsCommand = require("./funcs/lyrics.js");
const developerCommand = require("./funcs/owner.js");
const mcuCommand = require("./funcs/mcu.js");
const quizCommand = require("./funcs/quiz.js");

const app = express().use(express.json());

// --- TOKENS ---
const PAGE_ACCESS_TOKEN =
  "EAAUyQ2YrkywBQ3LHXLip0fTynkXnKg56iDUqm1RRpF5f3hVBPcwi1mksKBhrB5vmZCUVfORjkkDGZCSHCtmMZB0zKoWkBeHyNCBZCj8XCcVDU4VSW1WmE3WsjYGrcJ29E4PZB2goe8wpN05PTTSmIGHcL33VqpSY4upUuXc2ixryrbqEINCUFPFFvfnuibuaiIqOSPAZDZD";
const VERIFY_TOKEN = "getroned";

// Axios instance with token baked in — no need to repeat it in every call
const fbApi = axios.create({
  baseURL: "https://graph.facebook.com/v23.0/me/messages",
  params: { access_token: PAGE_ACCESS_TOKEN },
});

// Compiled once — reused across every message
const QUIZ_WRONG_PREFIX = "QUIZ_WRONG:";

// --- Messenger Profile Configuration ---
async function setMessengerProfile() {
  try {
    await axios.post(
      `https://graph.facebook.com/v23.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        get_started: { payload: "GET_STARTED_PAYLOAD" },
        commands: [
          {
            locale: "default",
            commands: [
              { name: "/help", description: "Show all available commands" },
              {
                name: "/developer",
                description: "Information about the developer",
              },
              { name: "/song", description: "Find and send music" },
              {
                name: "/mcu",
                description: "See the next Marvel movie countdown",
              },
              { name: "/menu", description: "Show the interactive quick menu" },
              { name: "/lyrics", description: "Find and send song lyrics" },
              { name: "/quiz", description: "Fetch random question" },
            ],
          },
        ],
        persistent_menu: [
          {
            locale: "default",
            composer_input_disabled: false,
            call_to_actions: [
              { type: "postback", title: "📜 Help", payload: "HELP_PAYLOAD" },
              {
                type: "postback",
                title: "👤 View Owner",
                payload: "DEVELOPER_PAYLOAD",
              },
            ],
          },
        ],
      },
    );
    console.log("✅ Messenger Profile updated");
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
  // Respond immediately — Facebook expects a fast 200 or it will retry
  res.status(200).send("EVENT_RECEIVED");

  const { body } = req;
  if (body.object !== "page") return;

  body.entry.forEach((entry) => {
    const webhook_event = entry.messaging?.[0];
    if (!webhook_event) return;

    const senderId = webhook_event.sender?.id;
    const messageMid = webhook_event.message?.mid;

    if (webhook_event.postback) {
      return handlePayload(
        senderId,
        webhook_event.postback.payload,
        messageMid,
      );
    }

    if (webhook_event?.message?.quick_reply?.payload) {
      return handlePayload(
        senderId,
        webhook_event.message.quick_reply.payload,
        messageMid,
      );
    }

    if (webhook_event?.message?.text) {
      return handleMessage(senderId, webhook_event.message.text, messageMid);
    }
  });
});

// --- Shared Payload Handler ---
function handlePayload(senderId, payload, messageMid) {
  // Dynamic payload: QUIZ_WRONG:CorrectAnswer
  if (payload.startsWith(QUIZ_WRONG_PREFIX)) {
    const correctAnswer = payload.slice(QUIZ_WRONG_PREFIX.length);
    return callSendAPI(
      senderId,
      {
        text: `❌ Wrong! The correct answer was: ${correctAnswer}.`,
        quick_replies: [
          {
            content_type: "text",
            title: "Try another one",
            payload: "QUIZ_PAYLOAD",
          },
        ],
      },
      messageMid,
    );
  }

  // Helper to reduce repetition in the switch
  const send = (msg) => callSendAPI(senderId, msg, messageMid);
  const cmd = (fn) =>
    fn(senderId, (psid, msg) => callSendAPI(psid, msg, messageMid));

  switch (payload) {
    case "GET_STARTED_PAYLOAD":
      return send({
        text: "Welcome! I am A.R.I.S.O.N., in short for Autonomous, Responsive, Intelligent Systems for Optimized Networking. Type /menu to see what I can do.",
      });

    case "HELP_PAYLOAD":
      return cmd(helpCommand);
    case "DEVELOPER_PAYLOAD":
      return cmd(developerCommand);
    case "MCU_PAYLOAD":
      return cmd(mcuCommand);
    case "QUIZ_PAYLOAD":
      return cmd(quizCommand);

    case "SONG_PAYLOAD":
      return send({
        text: "🎵 Please type the song name. Example: /song Manchild",
      });

    case "LYRICS_PAYLOAD":
      return send({
        text: "🎵 Please type the song name. Example: /lyrics Attention",
      });

    case "QUIZ_CORRECT":
      return send({
        text: "✅ Correct!",
        quick_replies: [
          {
            content_type: "text",
            title: "Try another one",
            payload: "QUIZ_PAYLOAD",
          },
        ],
      });
  }
}

// --- Logic Router ---
async function handleMessage(psid, text, mid) {
  // Fire both actions in parallel — no need to wait for one before the other
  await Promise.all([
    sendAction(psid, "mark_seen"),
    sendAction(psid, "typing_on"),
  ]).catch((err) => console.error("Action Error:", err.message));

  const input = text.toLowerCase().trim();
  const send = (msg) => callSendAPI(psid, msg, mid);
  const cmd = (fn) => fn(psid, (id, msg) => callSendAPI(id, msg, mid));

  if (input === "/menu") {
    return send({
      text: "Pick an option:",
      quick_replies: [
        { content_type: "text", title: "HELP", payload: "HELP_PAYLOAD" },
        {
          content_type: "text",
          title: "DEVELOPER",
          payload: "DEVELOPER_PAYLOAD",
        },
        { content_type: "text", title: "MCU", payload: "MCU_PAYLOAD" },
        { content_type: "text", title: "SONG", payload: "SONG_PAYLOAD" },
        { content_type: "text", title: "LYRICS", payload: "LYRICS_PAYLOAD" },
        { content_type: "text", title: "QUIZ", payload: "QUIZ_PAYLOAD" },
      ],
    });
  }

  if (input === "help" || input === "/help") return cmd(helpCommand);
  if (input === "/test") return cmd(testCommand);
  if (input === "/developer") return cmd(developerCommand);
  if (input === "/mcu") return cmd(mcuCommand);
  if (input === "/quiz") return cmd(quizCommand);
  if (input === "hi" || input === "hello") return send({ text: "Hello!" });

  if (input.startsWith("/song")) {
    const query = text.split(" ").slice(1).join(" ").trim();
    if (!query) return send({ text: "Please provide a song name." });
    return songCommand(psid, (id, msg) => callSendAPI(id, msg, mid), query);
  }

  if (input.startsWith("/lyrics")) {
    const query = text.split(" ").slice(1).join(" ").trim();
    if (!query) return send({ text: "Please provide a song name." });
    return lyricsCommand(psid, (id, msg) => callSendAPI(id, msg, mid), query);
  }

  if (input.includes("tiktok.com"))
    return tiktokCommand(psid, (id, msg) => callSendAPI(id, msg, mid), text);

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
      form.append(
        "message",
        JSON.stringify({
          attachment: { type: response.attachment.type, payload: {} },
        }),
      );
      form.append("messaging_type", "RESPONSE");
      if (replyMid) form.append("reply_to", JSON.stringify({ mid: replyMid }));
      form.append("filedata", fs.createReadStream(response.filedata));

      await axios.post(
        `https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form,
        { headers: form.getHeaders() },
      );
    } else {
      await fbApi.post("", {
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: response,
        ...(replyMid && { reply_to: { mid: replyMid } }),
      });
    }
  } catch (err) {
    console.error(
      "Send Error:",
      JSON.stringify(err.response?.data, null, 2) || err.message,
    );
  }
}

app.get("/health", (_, res) => res.status(200).json({ status: "ok" }));

const PORT = process.env.PORT || 1337;
app.listen(PORT, () => {
  console.log(`🚀 Webhook live on ${PORT}`);
  setMessengerProfile();
});
