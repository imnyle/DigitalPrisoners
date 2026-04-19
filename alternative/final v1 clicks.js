// ─── Image sources ───────────────────────────────────────────────────────────
let k = [
  "images/abstract-1.gif",
  "images/abstract-2.gif",
  "images/abstract-3.gif",
  "images/abstract-4.gif"
];

// ─── DOM references ──────────────────────────────────────────────────────────
let mainImage  = document.getElementById("myImage");
let selections = document.querySelectorAll(".selectionboxes");

// ─── Set default image ───────────────────────────────────────────────────────
mainImage.src = k[0];

// ─── Helper: switch the big image with a fade ────────────────────────────────
function switchToIndex(index) {
  if (index < 0 || index >= k.length) return;
  mainImage.style.opacity = 0;
  setTimeout(() => {
    mainImage.src         = k[index];
    mainImage.style.opacity = 1;
  }, 500);
}

// ─── Click behaviour (kept from original) ────────────────────────────────────
selections.forEach((box, index) => {
  box.addEventListener("click", () => {
    currentIndex = index;          // keep pose tracker in sync
    switchToIndex(index);
  });
});

// ─── Teachable Machine Pose ──────────────────────────────────────────────────
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/IjrZiJePi/";

let model, webcam, ctx, labelContainer;
let currentIndex    = 0;   // which image is currently shown
let lastSwitchTime  = 0;   // timestamp of last pose-triggered switch
const COOLDOWN_MS   = 1500; // minimum ms between pose-triggered switches
const CONFIDENCE    = 0.80; // minimum confidence to act on a pose

// Map pose class NAMES (from Teachable Machine) → image index 0-3
// Open your model URL in a browser and check the class names; update these if needed.
const poseToIndex = {
  "Pose 0": 0,
  "Pose 1": 1,
  "Pose 2": 2,
  "Pose 3": 3
};

async function initPoseModel() {
  const modelURL    = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";

  // Load model
  model = await tmPose.load(modelURL, metadataURL);

  // Set up webcam (width, height, flip)
  webcam = new tmPose.Webcam(200, 200, true);
  await webcam.setup();   // asks for camera permission
  await webcam.play();

  // Create a small hidden canvas for the webcam feed
  const canvas  = document.createElement("canvas");
  canvas.width  = 200;
  canvas.height = 200;
  canvas.style.cssText =
    "position:fixed;bottom:50px;right:10px;border-radius:8px;" +
    "border:1px solid rgba(255,255,255,0.4);opacity:0.75;z-index:999;";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");

  // Optional: small label display so you can see what pose is detected
  labelContainer = document.createElement("div");
  labelContainer.style.cssText =
    "position:fixed;bottom:10px;right:10px;color:white;font-size:12px;" +
    "background:rgba(0,0,0,0.5);padding:4px 8px;border-radius:6px;z-index:999;";
  document.body.appendChild(labelContainer);

  window.requestAnimationFrame(poseLoop);
}

async function poseLoop(timestamp) {
  webcam.update();                          // grab new webcam frame
  await predict(timestamp);
  window.requestAnimationFrame(poseLoop);
}

async function predict(timestamp) {
  // estimatePose returns { pose, posenetOutput }
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);

  // predict returns an array like [{ className, probability }, ...]
  const predictions = await model.predict(posenetOutput);

  // Find the class with the highest probability
  let best = predictions.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  // Update the small label
  labelContainer.textContent =
    best.className + " (" + (best.probability * 100).toFixed(0) + "%)";

  // Draw webcam to the small canvas
  ctx.drawImage(webcam.canvas, 0, 0);

  // Only switch if confident enough AND cooldown has elapsed
  if (
    best.probability >= CONFIDENCE &&
    timestamp - lastSwitchTime >= COOLDOWN_MS
  ) {
    const newIndex = poseToIndex[best.className];

    // newIndex will be undefined if the class name doesn't match — guard it
    if (newIndex !== undefined && newIndex !== currentIndex) {
      currentIndex   = newIndex;
      lastSwitchTime = timestamp;
      switchToIndex(newIndex);
    }
  }
}

// ─── Start everything ────────────────────────────────────────────────────────
initPoseModel().catch(err => {
  console.error("Teachable Machine pose init failed:", err);
});