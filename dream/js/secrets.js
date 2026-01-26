// Hidden sequences and secret modes

const Secrets = (function() {
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const buffer = [];
  let chaosMode = false;

  function checkSequence() {
    if (buffer.length < KONAMI.length) return false;
    const recent = buffer.slice(-KONAMI.length);
    return recent.every((key, i) => key === KONAMI[i]);
  }

  function flashScreen() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: white;
      z-index: 1000;
      pointer-events: none;
      animation: chaos-flash 0.3s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  }

  function init() {
    // Add flash animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes chaos-flash {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      .chaos-active .dream-text-container {
        animation: chaos-text 0.1s steps(3, end) infinite;
      }
      @keyframes chaos-text {
        0% { filter: hue-rotate(0deg); }
        33% { filter: hue-rotate(120deg); }
        66% { filter: hue-rotate(240deg); }
        100% { filter: hue-rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('keydown', (e) => {
      // Escape exits chaos mode
      if (e.key === 'Escape' && chaosMode) {
        exitChaos();
        return;
      }

      // Track key buffer
      buffer.push(e.key);
      if (buffer.length > KONAMI.length) {
        buffer.shift();
      }

      // Check for Konami code
      if (!chaosMode && checkSequence()) {
        enterChaos();
      }
    });
  }

  function enterChaos() {
    if (chaosMode) return;
    chaosMode = true;
    flashScreen();
    document.body.classList.add('chaos-active');
    Visuals.enterChaosMode();
    Glitch.trigger();
  }

  function exitChaos() {
    if (!chaosMode) return;
    chaosMode = false;
    document.body.classList.remove('chaos-active');
    Visuals.exitChaosMode();
  }

  function isActive() {
    return chaosMode;
  }

  return { init, isActive };
})();
