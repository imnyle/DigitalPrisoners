let k = ["images/abstract-1.gif", "images/abstract-2.gif", "images/abstract-3.gif", "images/abstract-4.gif"];



let mainImage = document.getElementById("myImage");
let selections = document.querySelectorAll(".selectionboxes");

// set a default image
mainImage.src = k[0];

// click behavior with fade
selections.forEach((box, index) => {
  box.addEventListener("click", () => {
    mainImage.style.opacity = 0;

    setTimeout(() => {
      mainImage.src = k[index];
      mainImage.style.opacity = 1;
    }, 500);
  });
});