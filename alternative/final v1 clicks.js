// ─── Image sources ───────────────────────────────────────────────────────────
//fixed
// Preload all images so they're cached and ready instantly

let k = [
  "images/abstract-1.gif",
  "images/abstract-2.gif",
  "images/abstract-3.gif",
  "images/abstract-4.gif"
];

k.forEach(src => {
  const img = new Image();
  img.src = src;
});

const switchSound = new Audio("audio/Harp Strum.wav");
switchSound.volume = .3;

// ─── DOM references ──────────────────────────────────────────────────────────
let mainImage  = document.getElementById("myImage");
let selections = document.querySelectorAll(".selectionboxes");

// ─── Set default image ───────────────────────────────────────────────────────
mainImage.src = k[0];

// ─── Helper: switch the big image with a fade ────────────────────────────────
let lastSoundTime = 0;
const SOUND_COOLDOWN_MS = 2000; // minimum ms between sounds

function switchToIndex(index) {
  if (index < 0 || index >= k.length) return;

  const newSrc = k[index];
  if (mainImage.src.endsWith(newSrc)) return;

  const preloader = new Image();
  preloader.src = newSrc;

  preloader.onload = () => {
    mainImage.style.opacity = 0;

    setTimeout(() => {
      mainImage.src = newSrc;
      mainImage.style.opacity = 1;

      const now = Date.now();
      if (now - lastSoundTime >= SOUND_COOLDOWN_MS) {
        switchSound.currentTime = 0;
        switchSound.play();
        lastSoundTime = now;
      }
    }, 300);
  };
}

// ─── Click behaviour (kept from original) ────────────────────────────────────
selections.forEach((box, index) => {
  box.addEventListener("click", () => {
    currentIndex = index;
    switchToIndex(index);
  });
});

// ─── Teachable Machine Pose ──────────────────────────────────────────────────
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/7yZQmehHs/";

let model, webcam, ctx, labelContainer;
let currentIndex   = 0;
let lastSwitchTime = 0;
let frameCount     = 0;
let poseBuffer     = [];

const COOLDOWN_MS   = 800;  // ms between switches
const CONFIDENCE    = 0.75; // minimum confidence to consider a pose
const PREDICT_EVERY = 3;    // only predict every Nth frame
const BUFFER_SIZE   = 3;    // pose must be consistent across N predictions

const poseToIndex = {
  "Pose 0": 0,
  "Pose 1": 1,
  "Pose 2": 2,
  "Pose 3": 3
};

async function initPoseModel() {
  const modelURL    = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";

  model  = await tmPose.load(modelURL, metadataURL);
  webcam = new tmPose.Webcam(150, 150, true);
  await webcam.setup();
  await webcam.play();

  // ✅ Create canvas AND assign ctx
  const canvas = document.createElement("canvas");
  canvas.width  = 150;
  canvas.height = 150;
  canvas.style.cssText =
    "position:absolute;top:10px;right:10px;border-radius:8px;" +
    "border:1px solid rgba(255,255,255,0.4);opacity:0.75;z-index:999;" +
    "width:120px;height:120px;";
  document.getElementById("mainimage").appendChild(canvas);
  ctx = canvas.getContext("2d"); // ✅ this line was missing

  // ✅ Create labelContainer element first, THEN style it
  labelContainer = document.createElement("div"); // ✅ this line was missing
  labelContainer.style.cssText =
    "position:absolute;top:135px;right:10px;color:white;font-size:12px;" +
    "background:rgba(0,0,0,0.5);padding:4px 8px;border-radius:6px;z-index:999;";
  document.getElementById("mainimage").appendChild(labelContainer);

  window.requestAnimationFrame(poseLoop);
}

async function poseLoop(timestamp) {
  webcam.update();
  frameCount++;

  if (frameCount % PREDICT_EVERY === 0) {
    await predict(timestamp);
  }

  window.requestAnimationFrame(poseLoop);
}

async function predict(timestamp) {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const predictions = await model.predict(posenetOutput);

  let best = predictions.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  labelContainer.textContent =
    best.className + " (" + (best.probability * 100).toFixed(0) + "%)";

  ctx.drawImage(webcam.canvas, 0, 0);

  if (best.probability >= CONFIDENCE) {
    poseBuffer.push(best.className);
    if (poseBuffer.length > BUFFER_SIZE) poseBuffer.shift();

    const allMatch = poseBuffer.every(p => p === best.className);
    const newIndex = poseToIndex[best.className];

    if (
      allMatch &&
      poseBuffer.length === BUFFER_SIZE &&
      newIndex !== undefined &&
      newIndex !== currentIndex &&
      timestamp - lastSwitchTime >= COOLDOWN_MS
    ) {
      currentIndex   = newIndex;
      lastSwitchTime = timestamp;
      switchToIndex(newIndex);
    }
  } else {
    poseBuffer = []; // reset if not confident
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────
initPoseModel().catch(err => {
  console.error("Teachable Machine pose init failed:", err);
});