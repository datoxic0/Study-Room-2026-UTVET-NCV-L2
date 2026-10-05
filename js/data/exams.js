// The timetable the app renders — derived, never hand-edited.
// Annual updates go in js/data/timetable.js (append a year block); this module
// picks the block a student should see right now and exposes its exam list so
// every consumer (dashboard, guides, tutor, papers) shares one selection rule.
import { selectExamBlock, startOfDay } from "../core/dates.js";
import { timetable } from "./timetable.js";

export { timetable };

export const activeExamBlock = selectExamBlock(timetable, startOfDay());
export const activeExamYear = activeExamBlock ? activeExamBlock.year : null;

// Consumers (dashboard/guides/tutor/papers) keep importing `exams` unchanged.
export const exams = activeExamBlock ? activeExamBlock.exams : [];

export const plan = [
  { title: "Recall what you know", description: "Close your notes and write down key ideas.", duration: "25 min" },
  { title: "Practice under exam conditions", description: "Try a past-paper question without help.", duration: "25 min" },
  { title: "Review and repair", description: "Check your answer and revisit one gap.", duration: "15 min" },
];
