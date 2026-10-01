export const NOTEBOOKS_AUTH_WALL = {
  measuredOn: "2026-09-30",
  evidence:
    "Unauthenticated fetch redirects to accounts.google.com sign-in (2 toolchains). Authenticated CDP session later fetched 17/17 notebooks — see research/02_NOTEBOOKLM_ACCESS_AUDIT.md",
  authenticatedFetch: "2026-09-30",
};

export const notebooks = [
  { id: "nb01", url: "https://notebook.google.com/notebook/0b9ba18c-4ccc-43b5-b2f3-f009a665d25d", share: "sign-in", title: "Mechatronic Studying L2" },
  { id: "nb02", url: "https://notebook.google.com/notebook/15f8ab87-e0dc-40a2-899c-dbdce3b8a106", share: "sign-in", title: "Computer Basics: A Practical Introduction to Systems and Software" },
  { id: "nb03", url: "https://notebook.google.com/notebook/528a75e0-1c65-4401-9da6-f0c5bbca0659", share: "sign-in", title: "Mechatronic Systems Advanced Study Guide and Assessment Paper" },
  { id: "nb04", url: "https://notebook.google.com/notebook/9b657786-131d-4c79-b27c-179bfc8e4c76", share: "sign-in", title: "NC(V) Mathematics NQF Level 2 Assessment and Marking Guideline" },
  { id: "nb05", url: "https://notebook.google.com/notebook/b52580ca-7d12-4efc-abcc-7ec96b9b6302", share: "sign-in", title: "Mechatronics Practical Assessment: Inductive Systems and Component Analysis" },
  { id: "nb06", url: "https://notebook.google.com/notebook/dbfaedda-d570-40d4-8a65-46461d22afc5", share: "sign-in", title: "Manual Manufacturing NQF Level 2 Marking Guideline February 2025" },
  { id: "nb07", url: "https://notebook.google.com/notebook/e3cc1a23-f428-4620-81b4-c38445461fba", share: "sign-in", title: "Guide to PC Hardware, Connectivity, and Networking Configuration" },
  { id: "nb08", url: "https://notebook.google.com/notebook/be05f280-ae30-4743-a419-7d0c331140a3", share: "sign-in", title: "Automated Mechatronics Garden Implementation and Sustainability Plan for Msinga" },
  { id: "nb09", url: "https://notebook.google.com/notebook/8b2b28c0-ab75-4b98-a3b5-029b4140f41a", share: "sign-in", title: "Logic Gates: Fundamentals, Symbols, and Truth Tables" },
  { id: "nb10", url: "https://notebook.google.com/notebook/9a8d361c-6b90-493b-a500-90f1faae1133", share: "sign-in", title: "Introduction to Computers: NCV Level 2 Exam Guide" },
  { id: "nb11", url: "https://notebook.google.com/notebook/213c22a8-b8cf-4bcf-8d06-491d43eae7b7", share: "sign-in", title: "Pathways to Mechatronic Pneumatic and Control Systems" },
  { id: "nb12", url: "https://notebook.google.com/notebook/f791dbc6-2f12-4296-b879-3cc54aae9ae5", share: "sign-in", title: "NC(V) Fundamentals Mathematics NQF Level 2 Task 6" },
  { id: "nb13", url: "https://notebook.google.com/notebook/85f3d7f6-2321-4715-8ada-cb7816fc27b4", share: "sign-in", title: "NCV Level 2 Manual Manufacturing Engineering Guide" },
  { id: "nb14", url: "https://notebook.google.com/notebook/4c380566-5aad-473a-a99c-2d3045ceaf2d", share: "author-flagged", authorNote: "cant share", title: "NC (V) Mechatronics Level 2 Integrated Summative Assessment Task" },
  { id: "nb15", url: "https://notebook.google.com/notebook/625ae2a2-3198-4f9e-b906-dbd9915ca3a9", share: "sign-in", title: "Electrotechnology NQF Level 2 November 2025 Examination Paper" },
  { id: "nb16", url: "https://notebook.google.com/notebook/2f776a22-ef84-47dc-9067-c67ebf2cdfca", share: "author-flagged", authorNote: "cant share", alternate: "https://gemini.google.com/app/7fc5f9b078bc944f", title: "Electrotechnology NQF Level 2 National Certificate Exam Papers" },
  { id: "nb17", url: "https://notebook.google.com/notebook/74d687c2-df47-4f02-82e6-eac3d66b3507", share: "author-flagged", authorNote: "cant share", alternate: "https://share.gemini.google/lksHSSoRFAbo", title: "NC (V) Mechatronics Level 2 Integrated Assessment Task" },
];

export function notebookLabel(entry, index) {
  if (entry.title) return entry.title;
  const short = entry.url.split("/").pop().slice(0, 8);
  return `Notebook ${String(index + 1).padStart(2, "0")} · ${short}…`;
}
