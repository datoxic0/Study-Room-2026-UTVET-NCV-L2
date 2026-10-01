// Modal scroll lock. The CSS rule `body:has(dialog[open]) { overflow: hidden }`
// covers modern engines; this inline lock is the belt-and-braces path for
// engines without :has() and for open/close races during the guide → paper
// handoff. sync always reads which dialog is open right now, so listener
// ordering between the two dialogs cannot leave the page unlocked or locked.
export function syncBodyScrollLock() {
  document.body.style.overflow = document.querySelector("dialog[open]") ? "hidden" : "";
}

for (const id of ["#guide-dialog", "#paper-dialog"]) {
  const node = document.querySelector(id);
  if (node) node.addEventListener("close", syncBodyScrollLock);
}
