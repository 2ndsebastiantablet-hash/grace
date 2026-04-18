const lockButton = document.getElementById("lock-button");
const regenButton = document.getElementById("regen-button");
const overlayPlayButton = document.getElementById("overlay-play-button");
const overlayCopy = document.getElementById("overlay-copy");
const overlay = document.getElementById("overlay");
const prompt = document.getElementById("prompt");
const objectiveTitle = document.getElementById("objective-title");
const objectiveCopy = document.getElementById("objective-copy");
const generationMeter = document.getElementById("generation-meter");
const generationPercent = document.getElementById("generation-percent");
const generationRingFill = document.getElementById("generation-ring-fill");

let queuedGeneration = false;
const GENERATION_MS = 1800;
const RING_LENGTH = 289.03;

function setGenerationProgress(progress) {
  const clamped = Math.max(0, Math.min(progress, 1));
  generationMeter?.style.setProperty("--progress", clamped.toFixed(3));
  if (generationRingFill) {
    generationRingFill.style.strokeDashoffset = String(RING_LENGTH * (1 - clamped));
  }
  if (generationPercent) {
    generationPercent.textContent = Math.round(clamped * 100) + "%";
  }
}

function beginGenerationPresentation() {
  document.body.classList.add("is-generating");
  generationMeter?.classList.add("is-visible");
  setGenerationProgress(0);
  if (objectiveTitle) {
    objectiveTitle.textContent = "Generating Course";
  }
  if (objectiveCopy) {
    objectiveCopy.textContent = "Terrain, obstacle, and spawn passes are running now.";
  }
  if (overlayCopy) {
    overlayCopy.textContent = "Generating map...";
  }
  if (prompt) {
    prompt.textContent = "Generating course...";
  }
}

function finishGenerationPresentation() {
  document.body.classList.remove("is-generating");
  generationMeter?.classList.remove("is-visible");
  setGenerationProgress(0);
  overlay?.classList.add("is-hidden");
  if (prompt) {
    prompt.textContent = "Map ready. Move with WASD and click if you need to re-enter the run.";
  }
}

function animateGeneration() {
  return new Promise((resolve) => {
    const startedAt = performance.now();

    function step(now) {
      const progress = Math.min((now - startedAt) / GENERATION_MS, 1);
      setGenerationProgress(progress);
      if (progress >= 1) {
        resolve();
        return;
      }
      window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
  });
}

async function generateFreshRun() {
  if (queuedGeneration || !regenButton) {
    return;
  }

  queuedGeneration = true;
  beginGenerationPresentation();
  await animateGeneration();
  regenButton.click();
  finishGenerationPresentation();
  queuedGeneration = false;
}

lockButton?.addEventListener("click", () => {
  generateFreshRun();
});

overlayPlayButton?.addEventListener("click", () => {
  lockButton?.click();
});
