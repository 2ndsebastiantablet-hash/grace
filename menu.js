const lockButton = document.getElementById("lock-button");
const regenButton = document.getElementById("regen-button");
const overlayPlayButton = document.getElementById("overlay-play-button");
const overlayCopy = document.getElementById("overlay-copy");

let queuedGeneration = false;

function generateFreshRun() {
  if (queuedGeneration || !regenButton) {
    return;
  }

  queuedGeneration = true;
  if (overlayCopy) {
    overlayCopy.textContent = "Generating a fresh run and dropping you into the course...";
  }

  window.setTimeout(() => {
    regenButton.click();
    queuedGeneration = false;
  }, 120);
}

lockButton?.addEventListener("click", generateFreshRun);

overlayPlayButton?.addEventListener("click", () => {
  generateFreshRun();
  lockButton?.click();
});
