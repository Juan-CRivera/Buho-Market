
const p2 = document.querySelector(".p2");

function flickerEffect() {
  const flickerOn = Math.random() > 0.5;
  p2.style.opacity = flickerOn ? "1" : "0.3";
  p2.style.filter = flickerOn ? "brightness(1.5)" : "brightness(0.6)";
}


const flickerInterval = setInterval(flickerEffect, Math.floor(Math.random() * 80) + 120);


setTimeout(() => {
  clearInterval(flickerInterval);

  p2.style.opacity = "1";
  p2.style.filter = "brightness(1)";
}, 1500);
