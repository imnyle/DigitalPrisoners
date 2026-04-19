const URL = "https://teachablemachine.withgoogle.com/models/IjrZiJePi/";

let model, webcam, ctx, labelContainer, maxPredictions;

let k = ["images/abstract-1.gif", "images/abstract-2.gif", "images/abstract-3.gif", "images/abstract-4.gif"];

let mainImage = document.getElementById("myImage");
let selections = document.querySelectorAll(".selectionboxes");

// set a default image
mainImage.src = k[0];

function changeImage(index) {
  mainImage.style.opacity = 0;

  setTimeout(() => {
    mainImage.src = k[index];
    mainImage.style.opacity = 1;
  }, 500);
}

selections.forEach((box, index) => {
  box.addEventListener("click", () => {
    changeImage(index);
  });
});

async function initPose() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  // load model
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // setup webcam
  const size = 300;
  webcam = new tmPose.Webcam(size, size, true); // flip = true
  await webcam.setup();
  await webcam.play();

  window.requestAnimationFrame(loop);

  // add webcam canvas to page
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  document.body.appendChild(canvas);

  ctx = canvas.getContext("2d");
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

let lastPose = -1; // prevents flickering
const threshold = 0.85; // confidence threshold

async function predict() {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const prediction = await model.predict(posenetOutput);

  let highestProb = 0;
  let bestClassIndex = -1;

  // find highest confidence pose
  for (let i = 0; i < prediction.length; i++) {
    if (prediction[i].probability > highestProb) {
      highestProb = prediction[i].probability;
      bestClassIndex = i;
    }
  }

  // only trigger if confident AND different from last pose
  if (highestProb > threshold && bestClassIndex !== lastPose) {
    lastPose = bestClassIndex;
    changeImage(bestClassIndex);
  }
}


initPose();