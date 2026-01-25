// Entry point - initializes all modules based on device capabilities

const DOM = {
  body: document.body,
  nameContainer: document.querySelector('.name-container'),
  navLinks: document.querySelector('.nav-links'),
  vignetteTL: document.querySelector('.vignette-top-left'),
  vignetteBR: document.querySelector('.vignette-bottom-right'),
  bgLayer1: document.querySelector('.bg-layer-1'),
  bgLayer2: document.querySelector('.bg-layer-2'),
};

// Keyboard navigation
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && !Gallery.isTransitioning()) {
      Gallery.cycle(1, true);
      Gallery.resetTimer();
    } else if (e.key === 'ArrowLeft' && !Gallery.isTransitioning()) {
      Gallery.cycle(-1, true);
      Gallery.resetTimer();
    }
  });
}

// Click to reveal background (desktop)
function initClickReveal() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, textarea, select')) return;
    DOM.body.classList.toggle('bg-reveal');
  });
}

// Initialize
Vignette.init(DOM);

Gallery.init(DOM).then(() => {
  initKeyboard();

  const hasPointer = window.matchMedia('(pointer: fine)').matches;
  if (hasPointer) {
    Parallax.init();
    initClickReveal();
  } else {
    Pan.init(DOM);
  }
});
