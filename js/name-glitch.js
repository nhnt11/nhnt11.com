// Name glitch effect - transforms name to "dream" during glitch

const NameGlitch = (function() {
  let link;
  let nameText;
  let dreamText;
  let slices;
  let isGlitching = false;

  function getRandomPosition() {
    const nameRect = nameText.getBoundingClientRect();
    const dreamRect = dreamText.getBoundingClientRect();

    // Calculate max offset so dream stays within the name block
    const maxX = Math.max(0, nameRect.width - dreamRect.width);
    const maxY = Math.max(0, nameRect.height - dreamRect.height);

    return {
      x: Math.random() * maxX,
      y: Math.random() * maxY
    };
  }

  function trigger() {
    if (isGlitching) return;
    isGlitching = true;

    // Random position for this glitch
    const pos = getRandomPosition();

    // Apply position to dream text and slices
    [dreamText, ...slices].forEach(el => {
      el.style.setProperty('--dream-x', `${pos.x}px`);
      el.style.setProperty('--dream-y', `${pos.y}px`);
      el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    });

    slices.forEach(slice => {
      slice.classList.remove('glitching');

      if (Math.random() > 0.3) {
        slice.style.setProperty('--glitch-x', `${(Math.random() - 0.5) * 60}px`);
        slice.style.setProperty('--glitch-skew', `${(Math.random() - 0.5) * 10}deg`);
        slice.classList.add('glitching');
      }
    });

    link.classList.add('glitching');

    setTimeout(() => {
      link.classList.remove('glitching');
      slices.forEach(slice => slice.classList.remove('glitching'));
      isGlitching = false;
      scheduleNext();
    }, 150 + Math.random() * 300);
  }

  function scheduleNext() {
    setTimeout(trigger, 2000 + Math.random() * 3333);
  }

  function init() {
    link = document.querySelector('.name-link');
    nameText = document.querySelector('.name-text');
    dreamText = document.querySelector('.name-dream');
    slices = document.querySelectorAll('.name-slice');
    if (!link || !nameText || !dreamText || !slices.length) return;

    // Wait for fonts to load before starting
    document.fonts.ready.then(() => {
      setTimeout(trigger, 1333);
    });
  }

  return { init, trigger };
})();
