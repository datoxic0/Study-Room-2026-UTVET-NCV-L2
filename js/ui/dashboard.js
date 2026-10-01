import { exams, plan } from "../data/exams.js";
import {
  fullDateFormatter,
  groupByMonth,
  localDateKey,
  parseExamDate,
  startOfDay,
  upcomingFrom,
  weekdayFormatter,
  daysUntil,
} from "../core/dates.js";
import { readJSON, writeJSON } from "../core/storage.js";

const today = startOfDay();
const localDateKeyToday = localDateKey(today);
const upcomingExams = upcomingFrom(exams, today);
const nextExam = upcomingExams[0] ?? null;
const nextExamDate = nextExam ? parseExamDate(nextExam.date) : null;
const daysToNextExam = nextExam ? daysUntil(nextExam.date, today) : null;

export function getUpcomingExams() {
  return upcomingExams;
}

export function getNextExam() {
  return nextExam;
}

export function getNextExamDate() {
  return nextExamDate;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderHeader() {
  document.querySelector("#today-label").textContent = fullDateFormatter.format(new Date()).toUpperCase();
  document.querySelector("#welcome-date").textContent = `· ${fullDateFormatter.format(new Date()).toUpperCase()}`;
  document.querySelector("#countdown-number").textContent = nextExam
    ? String(daysToNextExam).padStart(2, "0")
    : "—";
  document.querySelector("#countdown-copy").innerHTML = nextExam
    ? daysToNextExam === 1
      ? "day<br>to go"
      : "days<br>to go"
    : "term<br>complete";
  document.querySelector("#next-exam-subject").textContent = nextExam
    ? nextExam.subject
    : "All scheduled exams are complete";
  document.querySelector("#next-exam-date").textContent = nextExamDate
    ? fullDateFormatter.format(nextExamDate)
    : "";
  document.querySelector("#next-exam-time").textContent = nextExam?.time ?? "";
  document.querySelector("#next-exam-level").textContent = nextExam
    ? `LEVEL ${nextExam.level}`
    : "TERM COMPLETE";
  if (!nextExam) document.querySelector("#jump-to-exam").hidden = true;
}

function renderExams() {
  const list = document.querySelector("#exam-list");
  list.replaceChildren();

  for (const group of groupByMonth(upcomingExams)) {
    list.append(el("h3", "month-heading", group.key));
    for (const { exam, date } of group.exams) {
      const row = el("article", "exam-row");
      if (exam === nextExam) row.classList.add("is-next");

      const dateBlock = el("div", "exam-date-block");
      dateBlock.append(el("span", "exam-day", String(date.getDate()).padStart(2, "0")));
      const detail = el("span", "exam-day-detail");
      detail.append(
        el("span", "exam-weekday", weekdayFormatter.format(date).toUpperCase()),
        el("span", "exam-time", exam.time)
      );
      dateBlock.append(detail);

      row.append(dateBlock, el("h3", null, exam.subject), el("span", "exam-row-meta", exam.paper));
      list.append(row);
    }
  }

  if (!upcomingExams.length) {
    list.append(el("p", "exam-empty", "You've reached the end of your scheduled exam dates."));
  }
  document.querySelector("#exam-count").textContent = `${upcomingExams.length} LEFT`;
}

const planStateKey = `studyroom-plan-${localDateKeyToday}`;
const validIndexes = plan.map((_, index) => index);
let completedTasks = readJSON(planStateKey, [])
  .filter((index) => Number.isInteger(index) && validIndexes.includes(index));

function savePlanState() {
  writeJSON(planStateKey, completedTasks);
}

function renderPlan() {
  const list = document.querySelector("#plan-list");
  list.replaceChildren();

  plan.forEach((task, index) => {
    const isDone = completedTasks.includes(index);
    const row = el("div", `plan-item${isDone ? " is-done" : ""}`);

    const check = el("button", "plan-check", "✓");
    check.type = "button";
    check.setAttribute("aria-label", `${isDone ? "Mark incomplete" : "Mark complete"}: ${task.title}`);
    check.setAttribute("aria-pressed", String(isDone));
    check.addEventListener("click", () => {
      completedTasks = isDone
        ? completedTasks.filter((taskIndex) => taskIndex !== index)
        : [...completedTasks, index];
      savePlanState();
      renderPlan();
    });

    const copy = el("div");
    copy.append(el("p", "plan-title", task.title));
    const description = nextExam
      ? [
          `Close your notes and write down key ideas about ${nextExam.subject}.`,
          `Try a ${nextExam.subject} past-paper question without help.`,
          `Check your ${nextExam.subject} practice and revisit one gap.`,
        ][index]
      : task.description;
    copy.append(el("p", "plan-description", description));

    row.append(check, copy, el("span", "plan-duration", task.duration));
    list.append(row);
  });

  const done = completedTasks.length;
  document.querySelector("#plan-progress-label").textContent = `${done} of ${plan.length} done`;
  document.querySelector("#plan-progress-bar").style.width = `${(done / plan.length) * 100}%`;
}

export function initDashboard() {
  renderHeader();
  renderExams();
  renderPlan();

  document.querySelector("#jump-to-exam").addEventListener("click", () => {
    document.querySelector("#exam-plan").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#reset-plan").addEventListener("click", () => {
    completedTasks = [];
    savePlanState();
    renderPlan();
  });
}
