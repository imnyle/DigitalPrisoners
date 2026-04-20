// script.js
window.onload = () => {

  // 1. Wait 8 seconds, then start fading (assuming 2s fade duration)
  setTimeout(() => {
    document.body.classList.add('fade-out');
  }, 8000); 

  // 2. Redirect exactly at 10 seconds
  setTimeout(() => {
    window.location.href = "finalv1.html";
  }, 10000);
};