const { Mistral } = require("@mistralai/mistralai");

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

// Map stored as a module-level constant — built once, never rebuilt
const BOLD_MAP = new Map(
  Object.entries({
    a: "𝐚",
    b: "𝐛",
    c: "𝐜",
    d: "𝐝",
    e: "𝐞",
    f: "𝐟",
    g: "𝐠",
    h: "𝐡",
    i: "𝐢",
    j: "𝐣",
    k: "𝐤",
    l: "𝐥",
    m: "𝐦",
    n: "𝐧",
    o: "𝐨",
    p: "𝐩",
    q: "𝐪",
    r: "𝐫",
    s: "𝐬",
    t: "𝐭",
    u: "𝐮",
    v: "𝐯",
    w: "𝐰",
    x: "𝐱",
    y: "𝐲",
    z: "𝐳",
    A: "𝐀",
    B: "𝐁",
    C: "𝐂",
    D: "𝐃",
    E: "𝐄",
    F: "𝐅",
    G: "𝐆",
    H: "𝐇",
    I: "𝐈",
    J: "𝐉",
    K: "𝐊",
    L: "𝐋",
    M: "𝐌",
    N: "𝐍",
    O: "𝐎",
    P: "𝐏",
    Q: "𝐐",
    R: "𝐑",
    S: "𝐒",
    T: "𝐓",
    U: "𝐔",
    V: "𝐕",
    W: "𝐖",
    X: "𝐗",
    Y: "𝐘",
    Z: "𝐙",
    0: "𝟎",
    1: "𝟏",
    2: "𝟐",
    3: "𝟑",
    4: "𝟒",
    5: "𝟓",
    6: "𝟔",
    7: "𝟕",
    8: "𝟖",
    9: "𝟗",
  }),
);

// Regex compiled once at module load
const BOLD_REGEX = /\*\*(.*?)\*\*/g;

const makeBold = (text) =>
  text
    .split("")
    .map((c) => BOLD_MAP.get(c) ?? c)
    .join("");

module.exports = async (sender_psid, callSendAPI, messageText) => {
  const query = messageText.replace(/arison/gi, "").trim();

  if (!query) {
    return callSendAPI(sender_psid, { text: "⚠️ Please provide a prompt." });
  }

  try {
    const result = await mistral.agents.complete({
      agentId: "ag_019c76bbf73d70a4b805be900ed182cf",
      messages: [{ role: "user", content: query }],
    });

    const raw = result.choices?.[0]?.message?.content || "No response.";

    // Simplified callback — no unused `match` param
    const reply = raw.replace(BOLD_REGEX, (_, p1) => makeBold(p1));

    callSendAPI(sender_psid, { text: reply });
  } catch (error) {
    console.error("Mistral Error:", error);
    callSendAPI(sender_psid, {
      text: "❌ Unable to connect to the AI. Commands remain accessible for use.",
    });
  }
};

