const axios = require("axios");
const he = require("he"); // Decodes HTML entities like &quot; to "

module.exports = async function (psid, callSendAPI) {
  try {
    // 1️⃣ Fetch 1 General Knowledge question (Category 9)
    const res = await axios.get(
      "https://opentdb.com/api.php?amount=1&category=9&difficulty=easy&type=multiple"
    );

    const data = res.data;
    if (!data || !data.results || data.results.length === 0) {
      return callSendAPI(psid, { text: "❌ No questions found!" });
    }

    const q = data.results[0];
    const question = he.decode(q.question);
    const correctAnswer = he.decode(q.correct_answer);
    
    // 2️⃣ Decode and combine answers
    const options = q.incorrect_answers
      .map((a) => he.decode(a))
      .concat(correctAnswer)
      .sort(() => Math.random() - 0.5); // Shuffle

    // 3️⃣ Build quick replies
    // Note: We now attach the correctAnswer to the WRONG payload using a colon ":"
    const quick_replies = options.map((opt) => ({
      content_type: "text",
      title: opt.length > 20 ? opt.substring(0, 17) + "..." : opt,
      payload: opt === correctAnswer ? "QUIZ_CORRECT" : `QUIZ_WRONG:${correctAnswer}`,
    }));

    await callSendAPI(psid, {
      text: `🧠 [General Knowledge]\n\n${question}`,
      quick_replies,
    });

  } catch (err) {
    console.error("Quiz Error:", err.message);
    callSendAPI(psid, { text: "❌ Failed to fetch question. Try again later." });
  }
};
