const timerDuration = 25 * 60;
let secondsRemaining = timerDuration;
let timerTarget = null;
let timerInterval = null;
let timerComplete = false;

let display;
let progress;
let startButton;

function render() {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  display.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  progress.style.width = `${(secondsRemaining / timerDuration) * 100}%`;
  startButton.textContent = timerComplete
    ? "Start again →"
    : timerInterval
      ? "Pause session"
      : secondsRemaining < timerDuration
        ? "Resume session →"
        : "Start session →";
}

function stop() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function tick() {
  secondsRemaining = Math.max(0, Math.ceil((timerTarget - Date.now()) / 1000));
  if (secondsRemaining === 0) {
    stop();
    timerComplete = true;
    display.textContent = "Done";
    progress.style.width = "0%";
    startButton.textContent = "Start again →";
    return;
  }
  render();
}

export function initTimer() {
  display = document.querySelector("#timer-display");
  progress = document.querySelector("#timer-progress");
  startButton = document.querySelector("#timer-start");

  startButton.addEventListener("click", () => {
    if (timerInterval) {
      secondsRemaining = Math.max(0, Math.ceil((timerTarget - Date.now()) / 1000));
      stop();
      render();
      return;
    }
    if (timerComplete) {
      secondsRemaining = timerDuration;
      timerComplete = false;
    }
    timerTarget = Date.now() + secondsRemaining * 1000;
    timerInterval = window.setInterval(tick, 250);
    render();
  });

  document.querySelector("#timer-reset").addEventListener("click", () => {
    stop();
    secondsRemaining = timerDuration;
    timerComplete = false;
    render();
  });

  render();
}
