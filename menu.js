const overlay = document.getElementById("overlay");
const overlayCopy = document.getElementById("overlay-copy");
const overlayPlayButton = document.getElementById("overlay-play-button");
const lockButton = document.getElementById("lock-button");
const generationMeter = document.getElementById("generation-meter");
const generationPercent = document.getElementById("generation-percent");
const generationRingFill = document.getElementById("generation-ring-fill");
const prompt = document.getElementById("prompt");

const GENERATION_MS = 1800;
const RING_LENGTH = 289.03;

let isAnimating = false;

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
  if (overlay) {
    overlay.classList.remove("is-hidden");
  }
  if (overlayCopy) {
    overlayCopy.textContent = "Generating map...";
  }
  if (prompt) {
    prompt.textContent = "Generating course...";
  }
  setGenerationProgress(0);
}

function finishGenerationPresentation() {
  document.body.classList.remove("is-generating");
  generationMeter?.classList.remove("is-visible");
  setGenerationProgress(0);
}

function runGenerationPresentation() {
  if (isAnimating) {
    return;
  }

  isAnimating = true;
  beginGenerationPresentation();
  const startedAt = performance.now();

  function step(now) {
    const progress = Math.min((now - startedAt) / GENERATION_MS, 1);
    setGenerationProgress(progress);
    if (progress >= 1) {
      finishGenerationPresentation();
      isAnimating = false;
      return;
    }
    window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
}

overlayPlayButton?.addEventListener("click", runGenerationPresentation);
lockButton?.addEventListener("click", runGenerationPresentation);
