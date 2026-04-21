// Images
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

const switchSounds = [
  new Audio("audio/s4p bloop 1.mp3"),
  new Audio("audio/s4p bloop 2.mp3"),
  new Audio("audio/s4p bloop 3.mp3"),
  new Audio("audio/s4p bloop 4.mp3")
];

// ✅ Fix: set volume on each sound individually, not the array
switchSounds.forEach(s => s.volume = 0.3);

// Low confidence ambient sound
const lowConfidenceSound = new Audio("audio/angry sound.mp3"); // 🔁 replace with your file
lowConfidenceSound.loop   = true;  // loops until confidence returns
lowConfidenceSound.volume = 0.3;
let isLowConfidencePlaying = false; // tracks whether it's currently playing

// Connecting to HTML
let mainImage  = document.getElementById("myImage");
let selections = document.querySelectorAll(".selectionboxes");
const poseOverlay = document.getElementById("poseOverlay");

// Default image
mainImage.src = k[0];

// Switch function with animation and sounds
let lastSoundTime = 0;
const SOUND_COOLDOWN_MS = 2000;

// near the top with your other state variables
let isFading = false;

function fadeOutSound(sound, duration = 1000) {
  if (isFading) return; // ✅ prevent multiple fades stacking up
  isFading = true;

  const steps = 20;
  const interval = duration / steps;
  const volumeStep = sound.volume / steps;

  const fade = setInterval(() => {
    if (sound.volume > volumeStep) {
      sound.volume -= volumeStep;
    } else {
      sound.volume = 0;
      sound.pause();
      sound.currentTime = 0;
      sound.volume = 0.3; // reset for next time
      isFading = false;   // ✅ allow future fades
      clearInterval(fade);
    }
  }, interval);
}


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
        const randomSound = switchSounds[Math.floor(Math.random() * switchSounds.length)];
        randomSound.currentTime = 0;
        randomSound.play();
        lastSoundTime = now;
      }
    }, 300);
  };
}

// Clicking
selections.forEach((box, index) => {
  box.addEventListener("click", () => {
    currentIndex = index;
    switchToIndex(index);
  });
});

// Teachable Machine
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/7yZQmehHs/";

let model, webcam, ctx, labelContainer;
let currentIndex   = 0;
let lastSwitchTime = 0;
let frameCount     = 0;
let poseBuffer     = [];

const COOLDOWN_MS        = 800;
const CONFIDENCE         = 0.99; // threshold to trigger image switch
const LOW_CONF_THRESHOLD = 0.99; // below this plays the ambient sound
const PREDICT_EVERY      = 3;
const BUFFER_SIZE        = 5;

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

  const canvas = document.createElement("canvas");
  canvas.width  = 150;
  canvas.height = 150;
  canvas.style.cssText =
    "position:absolute;top:10px;right:10px;border-radius:8px;" +
    "border:1px solid rgba(255,255,255,0.4);opacity:0.75;z-index:999;" +
    "width:120px;height:120px;";
  document.getElementById("mainimage").appendChild(canvas);
  ctx = canvas.getContext("2d");

  labelContainer = document.createElement("div");
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

    if (best.probability < LOW_CONF_THRESHOLD) {
    // ✅ Show red overlay
    poseOverlay.style.display = "flex";

    if (!isLowConfidencePlaying && !isFading) {
      lowConfidenceSound.currentTime = 0;
      lowConfidenceSound.play();
      isLowConfidencePlaying = true;
    }
  } else if (best.probability >= CONFIDENCE) {
    // ✅ Hide red overlay
    poseOverlay.style.display = "none";

    if (isLowConfidencePlaying && !isFading) {
      isLowConfidencePlaying = false;
      fadeOutSound(lowConfidenceSound, 1000);
    }
  }

  // Pose switching logic (unchanged)
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
    poseBuffer = [];
  }
}

// Start
initPoseModel().catch(err => {
  console.error("Teachable Machine pose init failed:", err);
});