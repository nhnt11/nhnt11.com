// Background image cycling with preloading and crossfade transitions

const Gallery = (function() {
  let bgLayer1, bgLayer2, body;
  let currentIndex = 0;
  let activeLayer = null;
  let isTransitioning = false;
  let cycleIntervalId = null;
  const imageData = [];
  const onCycleCallbacks = [];

  function preloadImage(index) {
    return new Promise((resolve) => {
      if (imageData[index]) {
        resolve(imageData[index]);
        return;
      }
      const img = new Image();
      img.onload = function() {
        imageData[index] = { width: this.naturalWidth, height: this.naturalHeight };
        resolve(imageData[index]);
      };
      img.onerror = () => resolve(null);
      img.src = IMAGES[index];
    });
  }

  function preloadAllImages() {
    IMAGES.forEach((_, index) => preloadImage(index));
  }

  function calculateBackgroundSize(imgWidth, imgHeight) {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const imgAspect = imgWidth / imgHeight;
    const viewAspect = viewWidth / viewHeight;

    let finalWidth, finalHeight;

    if (imgAspect >= viewAspect) {
      finalWidth = viewWidth * LAYOUT.maxOverflow;
      finalHeight = finalWidth / imgAspect;
      if (finalHeight < viewHeight * LAYOUT.minOverflow) {
        finalHeight = viewHeight * LAYOUT.minOverflow;
        finalWidth = finalHeight * imgAspect;
      }
    } else {
      finalHeight = viewHeight * LAYOUT.maxOverflow;
      finalWidth = finalHeight * imgAspect;
      if (finalWidth < viewWidth * LAYOUT.minOverflow) {
        finalWidth = viewWidth * LAYOUT.minOverflow;
        finalHeight = finalWidth / imgAspect;
      }
    }

    return `${finalWidth}px ${finalHeight}px`;
  }

  function setLayerImage(layer, index) {
    const src = IMAGES[index];
    const data = imageData[index];
    layer.style.backgroundImage = `url('${src}')`;
    if (data) {
      layer.style.backgroundSize = calculateBackgroundSize(data.width, data.height);
    }
  }

  function updateAllBackgroundSizes() {
    [bgLayer1, bgLayer2].forEach((layer) => {
      const layerIndex = layer === activeLayer ? currentIndex : (currentIndex + 1) % IMAGES.length;
      const data = imageData[layerIndex];
      if (data) {
        layer.style.backgroundSize = calculateBackgroundSize(data.width, data.height);
      }
    });
  }

  function cycle(direction = 1, fast = false) {
    if (IMAGES.length <= 1 || isTransitioning) return;

    const nextIndex = (currentIndex + direction + IMAGES.length) % IMAGES.length;
    const inactiveLayer = activeLayer === bgLayer1 ? bgLayer2 : bgLayer1;
    const duration = fast ? TIMING.transitionFast : TIMING.transitionSlow;

    isTransitioning = true;

    preloadImage(nextIndex).then(() => {
      setLayerImage(inactiveLayer, nextIndex);
      inactiveLayer.style.backgroundPosition = activeLayer.style.backgroundPosition;

      if (fast) {
        bgLayer1.style.transitionDuration = `${duration}ms`;
        bgLayer2.style.transitionDuration = `${duration}ms`;
      }

      activeLayer.classList.remove('active');
      inactiveLayer.classList.add('active');

      activeLayer = inactiveLayer;
      currentIndex = nextIndex;
      localStorage.setItem('lastBgIndex', currentIndex);

      preloadImage((currentIndex + 1) % IMAGES.length);
      onCycleCallbacks.forEach(cb => cb());

      setTimeout(() => {
        isTransitioning = false;
        if (fast) {
          bgLayer1.style.transitionDuration = '';
          bgLayer2.style.transitionDuration = '';
        }
      }, duration);
    });
  }

  function resetTimer() {
    if (cycleIntervalId) {
      clearInterval(cycleIntervalId);
    }
    if (IMAGES.length > 1) {
      cycleIntervalId = setInterval(() => cycle(1), TIMING.cyclePause);
    }
  }

  function setPosition(x, y) {
    const position = `${x}% ${y}%`;
    bgLayer1.style.backgroundPosition = position;
    bgLayer2.style.backgroundPosition = position;
  }

  function setTransition(value) {
    bgLayer1.style.transition = value;
    bgLayer2.style.transition = value;
  }

  function onCycle(callback) {
    onCycleCallbacks.push(callback);
  }

  function init(elements) {
    bgLayer1 = elements.bgLayer1;
    bgLayer2 = elements.bgLayer2;
    body = elements.body;
    activeLayer = bgLayer1;

    const lastIndex = localStorage.getItem('lastBgIndex');
    if (lastIndex !== null) {
      currentIndex = (parseInt(lastIndex, 10) + 1) % IMAGES.length;
    } else {
      currentIndex = Math.floor(Math.random() * IMAGES.length);
    }
    localStorage.setItem('lastBgIndex', currentIndex);

    window.addEventListener('resize', updateAllBackgroundSizes);

    return preloadImage(currentIndex).then(() => {
      setLayerImage(bgLayer1, currentIndex);
      bgLayer1.style.backgroundPosition = '50% 50%';
      body.classList.remove('page-loading');
      preloadAllImages();
      resetTimer();
    });
  }

  return {
    init,
    cycle,
    resetTimer,
    setPosition,
    setTransition,
    onCycle,
    updateSizes: updateAllBackgroundSizes,
    isTransitioning: () => isTransitioning,
    getCurrentIndex: () => currentIndex,
    getImageData: (index) => imageData[index],
  };
})();
