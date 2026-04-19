const URL = "https://teachablemachine.withgoogle.com/models/IjrZiJePi/";

let model, webcam, ctx, maxPredictions;
let currentIndex = -1; // prevents constant switching

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // setup webcam
  const size = 300;
  webcam = new tmPose.Webcam(size, size, true);
  await webcam.setup();
  await webcam.play();
  window.requestAnimationFrame(loop);

  document.getElementById("webcam").srcObject = webcam.webcam;
  const video = document.getElementById("webcam");
video.srcObject = webcam.webcam;
video.play();
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const prediction = await model.predict(posenetOutput);

  // find highest confidence pose
  let highest = 0;
  let index = 0;

  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].probability > highest) {
      highest = prediction[i].probability;
      index = i;
    }
  }

  // only trigger if confident AND different pose
  if (highest > 0.85 && index !== currentIndex) {
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

init();