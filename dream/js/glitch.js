// Text glitch effect with random slice displacement

const Glitch = (function() {
  const container = document.querySelector('.dream-text-container');
  const slices = document.querySelectorAll('.dream-slice');

  let isGlitching = false;

  function trigger(scheduleNext = true) {
    if (isGlitching) return;
    isGlitching = true;

    // Clear any previous frozen state and set up new glitch
    slices.forEach(slice => {
      slice.style.opacity = '';
      slice.style.transform = '';
      slice.classList.remove('glitching');

      if (Math.random() > 0.3) {
        slice.style.setProperty('--glitch-x', `${(Math.random() - 0.5) * 60}px`);
        slice.style.setProperty('--glitch-skew', `${(Math.random() - 0.5) * 10}deg`);
        slice.classList.add('glitching');
      }
    });

    container.classList.add('glitching');

    // User-triggered glitches freeze, scheduled glitches don't
    const shouldFreeze = !scheduleNext;

    setTimeout(() => {
      container.classList.remove('glitching');

      slices.forEach(slice => {
        if (shouldFreeze && slice.classList.contains('glitching')) {
          const x = slice.style.getPropertyValue('--glitch-x');
          const skew = slice.style.getPropertyValue('--glitch-skew');
          slice.classList.remove('glitching');
          slice.style.opacity = '1';
          slice.style.transform = `translateX(${x}) skewX(${skew})`;
        } else {
          slice.classList.remove('glitching');
        }
      });

      isGlitching = false;
      if (scheduleNext) scheduleNext_();
    }, 100 + Math.random() * 200);
  }

  function scheduleNext_() {
    setTimeout(() => trigger(true), 800 + Math.random() * 1700);
  }

  function init() {
    container.addEventListener('mousemove', () => trigger(false));
    setTimeout(scheduleNext_, 5500);
  }

  return { init, trigger };
})();
