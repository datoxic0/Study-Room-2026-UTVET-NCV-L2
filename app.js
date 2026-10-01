import { initDashboard } from "./js/ui/dashboard.js";
import { initPapers } from "./js/ui/papers.js";
import { initNotebooks } from "./js/ui/notebooks.js";
import { initGuides } from "./js/ui/guides.js";
import { initTutor } from "./js/ui/tutor.js";
import { initTimer } from "./js/ui/timer.js";

const VIEWS = ["dashboard", "guides", "papers", "notebooks"];
const initialised = new Set();

function resolveView() {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "exam-plan" || hash === "top") return "dashboard";
  if (hash.startsWith("view-")) return hash.slice("view-".length);
  return VIEWS.includes(hash) ? hash : "dashboard";
}

function show(view) {
  const target = VIEWS.includes(view) ? view : "dashboard";
  for (const name of VIEWS) {
    const section = document.querySelector(`#view-${name}`);
    if (section) section.hidden = name !== target;
  }
  for (const link of document.querySelectorAll("[data-nav]")) {
    const active = link.dataset.nav === target;
    link.classList.toggle("is-active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  }
  if (!initialised.has(target)) {
    initialised.add(target);
    if (target === "guides") initGuides();
    if (target === "papers") initPapers();
    if (target === "notebooks") initNotebooks();
  }
}

function onRouteChange() {
  const view = resolveView();
  show(view);
  const hash = window.location.hash;
  if (hash === "#exam-plan" || hash === "#top") {
    document.querySelector(hash === "#top" ? "#top" : "#exam-plan")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo(0, 0);
  }
}

initDashboard();
initTutor();
initTimer();
show(resolveView());

window.addEventListener("hashchange", onRouteChange);

if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline shell unavailable — app still works online */
    });
  });
}
