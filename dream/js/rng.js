// Seeded PRNG for reproducible effect/palette transitions
// Must load before effects and visuals

const RNG = (function() {
  // Load seed from localStorage or generate new one
  const storedSeed = localStorage.getItem('dream-seed');
  const seedFromStorage = !!storedSeed;
  let seed = storedSeed ? parseInt(storedSeed, 10) : Math.floor(Math.random() * 0xFFFFFFFF);
  let state = seed;

  // Store seed for future sessions
  localStorage.setItem('dream-seed', seed.toString());

  // Mulberry32 PRNG
  function next() {
    let t = state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  function getSeed() {
    return seed;
  }

  function setSeed(newSeed) {
    seed = newSeed >>> 0;
    state = seed;
    localStorage.setItem('dream-seed', seed.toString());
    console.log('Seed set to:', seed);
  }

  function isFromStorage() {
    return seedFromStorage;
  }

  function clearAndReload() {
    localStorage.removeItem('dream-seed');
    location.reload();
  }

  // Log seed on load
  console.log('RNG seed:', seed, seedFromStorage ? '(from storage)' : '(new)');

  return {
    next,
    getSeed,
    setSeed,
    isFromStorage,
    clearAndReload
  };
})();
