const URL = "https://teachablemachine.withgoogle.com/models/IjrZiJePi/";

const mainImage = document.getElementById("myImage");
const selections = document.querySelectorAll(".selectionboxes");

let k = [
  "images/abstract-1.gif",
  "images/abstract-2.gif",
  "images/abstract-3.gif",
  "images/abstract-4.gif"
];

let stableIndex = -1;
let stableCount = 0;

// set default image
mainImage.src = k[0];

let model, webcam, ctx, maxPredictions;
let currentIndex = -1; // prevents constant switching

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  const size = 300;
  webcam = new tmPose.Webcam(size, size, true);

  await webcam.setup();  // asks for camera permission
  await webcam.play();   // keep ONLY if it exists

  if (!webcam.canvas) {
    console.error("Webcam failed to initialize");
    return;
  }
  const container = document.getElementById("cameraContainer");
  container.innerHTML = "";
  container.appendChild(webcam.canvas); // ✅ FIXED

    await webcam.setup();

  if (webcam.play) {
    await webcam.play();
  }

  // wait until video is ready
  await new Promise(resolve => {
    const check = setInterval(() => {
      if (webcam.webcam && webcam.webcam.readyState === 4) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });

  window.requestAnimationFrame(loop);
}

let isPredicting = false;

async function loop() {
  webcam.update();

  if (!isPredicting) {
  isPredicting = true;
  try {
    await predict();
  } finally {
    isPredicting = false;
  }
  }

  window.requestAnimationFrame(loop);
}

async function predict() {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);

  const prediction = await model.predict(posenetOutput);

  let highest = 0;
  let index = 0;

  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].probability > highest) {
      highest = prediction[i].probability;
      index = i;
    }
  }

  if (highest > 0.75 && index !== currentIndex) {
  currentIndex = index;
  changeImage(index);
  }

  if (index === stableIndex) {
  stableCount++;
} else {
  stableIndex = index;
  stableCount = 1;
}

if (stableCount > 5 && highest > 0.75 && index !== currentIndex) {
  currentIndex = index;
  changeImage(index);
}
}


function changeImage(index) {
  mainImage.style.opacity = 0;

  setTimeout(() => {
    mainImage.src = k[index];
    mainImage.style.opacity = 1;
  }, 500);
}

selections.forEach((box, index) => {
  box.addEventListener("click", () => {
    currentIndex = index;
    changeImage(index);
  });
});


document.getElementById("startBtn").addEventListener("click", async () => {
  await init();

  document.getElementById("cameraContainer").style.display = "block";
  document.getElementById("startBtn").style.display = "none";
});