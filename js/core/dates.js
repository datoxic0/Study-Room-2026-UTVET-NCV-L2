export function startOfDay(input = new Date()) {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function localDateKey(date = startOfDay()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseExamDate(dateStr) {
  return startOfDay(new Date(`${dateStr}T12:00:00`));
}

export function upcomingFrom(examList, from = startOfDay()) {
  const floor = startOfDay(from);
  return examList.filter((exam) => parseExamDate(exam.date) >= floor);
}

export function daysBetween(from, to) {
  const a = startOfDay(from);
  const b = startOfDay(to);
  const noonA = new Date(a);
  noonA.setHours(12, 0, 0, 0);
  return Math.round((b.getTime() - noonA.getTime()) / 86400000);
}

export function daysUntil(target, from = new Date()) {
  return Math.max(0, daysBetween(from, parseExamDate(target)));
}

export const monthFormatter = new Intl.DateTimeFormat("en", { month: "long" });
export const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
export const fullDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function groupByMonth(examList) {
  const groups = [];
  for (const exam of examList) {
    const date = parseExamDate(exam.date);
    const key = `${monthFormatter.format(date)} ${date.getFullYear()}`.toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.exams.push({ exam, date });
    } else {
      groups.push({ key, exams: [{ exam, date }] });
    }
  }
  return groups;
}

// Which timetable block does the app show? The first (oldest) block that still
// has at least one exam on/after `from` — i.e. the sitting a student is
// currently preparing for. If every block is historical, show the latest block
// so the dashboard can say "complete" against real dates instead of going blank.
export function selectExamBlock(blocks, from = startOfDay()) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  const sorted = [...blocks].sort((a, b) => a.year - b.year);
  const floor = startOfDay(from);
  for (const block of sorted) {
    if (block.exams.some((exam) => parseExamDate(exam.date) >= floor)) return block;
  }
  return sorted[sorted.length - 1];
}
