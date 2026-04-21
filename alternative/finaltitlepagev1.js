window.onload = () => {

  // 10 seconds before fade animation
  setTimeout(() => {
    document.body.classList.add('fade-out');
  }, 10000); 

  // Then move to other site at 12 seconds
  setTimeout(() => {
    window.location.href = "finalv1.html";
  }, 12000);
};