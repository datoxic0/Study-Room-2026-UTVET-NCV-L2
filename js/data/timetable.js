// Annual exam timetables — APPEND A NEW BLOCK PER SITTING YEAR.
//
// How to update every year (no code changes needed):
//   1. Copy your published NC(V) timetable into a new block below, newest last:
//        { year: 2027, exams: [ { date, time, subject, level, duration, paper, term }, ... ] }
//   2. Dates are ISO "YYYY-MM-DD"; `year` must equal the calendar year of every
//      date in the block (validated by the test suite).
//   3. term = 1..4 (South African academic terms). Term 4 = October–December:
//      the sitting may start in October, run through November or finish in
//      December — all of it is term 4. Keep the term on every row so papers
//      and dates line up.
//   4. subject must match a registry subject in js/data/sources.js (the test
//      suite fails loudly if it does not, so nothing shows up unlinked).
//   5. Run: node scripts/validate.mjs && node --test "tests/*.test.mjs"
//
// The app shows the first block that still has exams ahead of today; if all
// blocks are historical it shows the latest one (dashboard then reads
// "complete" against real dates instead of going blank).
export const timetable = [
  {
    year: 2026,
    exams: [
      { date: "2026-10-19", time: "09:00", subject: "Life Skills and Computer Literacy", level: "L2", duration: "2 hr", paper: "Paper 2", term: 4 },
      { date: "2026-10-27", time: "13:00", subject: "Mathematics", level: "L2", duration: "3 hr", paper: "Paper 1", term: 4 },
      { date: "2026-10-28", time: "13:00", subject: "Mathematics", level: "L2", duration: "3 hr", paper: "Paper 2", term: 4 },
      { date: "2026-10-29", time: "09:00", subject: "English First Additional Language", level: "L2", duration: "2 hr", paper: "Paper 1", term: 4 },
      { date: "2026-10-30", time: "09:00", subject: "English First Additional Language", level: "L2", duration: "2 hr", paper: "Paper 2", term: 4 },
      { date: "2026-11-05", time: "13:00", subject: "Life Skills and Computer Literacy", level: "L2", duration: "2 hr", paper: "Paper 1", term: 4 },
      { date: "2026-11-06", time: "13:00", subject: "Electrotechnology", level: "L2", duration: "3 hr", paper: "Paper 1", term: 4 },
      { date: "2026-11-11", time: "13:00", subject: "Introduction to Computer", level: "L2", duration: "3 hr", paper: "Paper 1", term: 4 },
      { date: "2026-11-12", time: "13:00", subject: "Manual Manufacturing", level: "L2", duration: "3 hr", paper: "Paper 1", term: 4 },
      { date: "2026-11-16", time: "13:00", subject: "Mechatronic Systems", level: "L2", duration: "3 hr", paper: "Paper 1", term: 4 },
    ],
  },
];
