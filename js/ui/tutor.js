import { getUpcomingExams, getNextExam, getNextExamDate } from "./dashboard.js";
import { fullDateFormatter } from "../core/dates.js";

const conversation = [];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function addMessage(text, type) {
  const message = el("div", `chat-message ${type}-message`);
  if (type === "buddy") {
    const avatar = el("span", "message-avatar", "S");
    avatar.setAttribute("aria-hidden", "true");
    message.append(avatar);
  }
  message.append(el("p", null, text));
  const feed = document.querySelector("#chat-messages");
  feed.append(message);
  feed.scrollTop = feed.scrollHeight;
  return message;
}

function systemPrompt() {
  const nextExam = getNextExam();
  const nextExamDate = getNextExamDate();
  const schedule = getUpcomingExams()
    .map((exam) => `${exam.date} ${exam.time} ${exam.subject} (${exam.paper}, ${exam.duration})`)
    .join("; ");
  return [
    "You are Studyroom, a warm, rigorous study tutor helping a Level 2 TVET student at a South African college prepare for NC(V) Level 2 exams.",
    nextExam
      ? `Next exam: ${nextExam.subject}, ${fullDateFormatter.format(nextExamDate)} at ${nextExam.time} (${nextExam.paper}).`
      : "All listed exam dates have passed.",
    `Exam schedule: ${schedule}.`,
    "The app has a 'Past papers' tab with verified links to NC(V) L2 question papers and memoranda — when a student asks for past papers, memoranda or practice, point them to that tab for their subject, then keep teaching here.",
    "Help the student learn actively: explain in small steps, use worked examples, encourage retrieval practice, end with one short check-for-understanding when it fits.",
    "For quiz requests, ask one question at a time and wait for the answer before revealing the solution.",
    "Be accurate, concise, supportive. Never promise a pass. Never invent syllabus content — if information is missing, state the assumption or ask which topic/paper they are studying.",
  ].join(" ");
}

async function sendToBuddy(text) {
  const message = text.trim();
  const input = document.querySelector("#chat-input");
  const form = document.querySelector("#chat-form");
  const sendButton = form.querySelector("button[type='submit']");
  if (!message || sendButton.disabled) return;

  addMessage(message, "user");
  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;
  conversation.push({ role: "user", content: message });
  const typing = addMessage("Thinking through that with you…", "typing");

  try {
    if (!window.websim?.chat?.completions?.create) {
      throw new Error("The study buddy is unavailable right now. Please try again in a moment.");
    }
    const completion = await window.websim.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt() }, ...conversation.slice(-12)],
    });
    const answer = completion?.content?.trim() || "I couldn't shape a helpful answer just now. Try asking that a different way.";
    conversation.push({ role: "assistant", content: answer });
    typing.remove();
    addMessage(answer, "buddy");
  } catch (error) {
    typing.remove();
    conversation.pop();
    addMessage(error?.message || "I couldn't connect just now. Please try again.", "buddy");
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

export function initTutor() {
  const form = document.querySelector("#chat-form");
  const input = document.querySelector("#chat-input");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendToBuddy(input.value);
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 86)}px`;
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  for (const chip of document.querySelectorAll(".prompt-chip")) {
    chip.addEventListener("click", () => {
      sendToBuddy(`${chip.dataset.prompt} ${getNextExam()?.subject ?? "my current subject"}.`);
    });
  }
}
