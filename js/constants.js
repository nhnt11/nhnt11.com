// Configuration values for timing, layout, and content

const TIMING = {
  transitionSlow: 1500,   // ms - crossfade between images
  transitionFast: 500,    // ms - user-initiated image switches
  cyclePause: 5000,       // ms - time between auto-advances
  parallaxSmooth: 500,    // ms - smooth first parallax move
};

const LAYOUT = {
  vignettePadding: 250,   // px - breathing room around text
  parallaxDeadzone: 50,   // px - edge area where parallax stops
  tapEdgeZone: 0.15,      // fraction - edge tap to change image
  tapThreshold: 10,       // px - movement before tap becomes pan
  minOverflow: 1.15,      // fraction - minimum image overflow for parallax
  maxOverflow: 1.35,      // fraction - target overflow on larger dimension
  panSpeedX: 0.0008,      // fraction/ms - horizontal pan speed on mobile
};

const IMAGES = [
  'https://cdn.nhnt11.com/bg-tuscany.jpg',
  'https://cdn.nhnt11.com/DSC02365-Edit-Edit-2.jpg',
  'https://cdn.nhnt11.com/DSC02426-Edit-2.jpg',
  'https://cdn.nhnt11.com/DSC02446-Edit.jpg',
  'https://cdn.nhnt11.com/DSC02928-Edit.jpg',
  'https://cdn.nhnt11.com/DSC02978-Edit-2.jpg',
  'https://cdn.nhnt11.com/DSC03498-Edit-2.jpg',
  'https://cdn.nhnt11.com/DSC05664-Edit.jpg',
  'https://cdn.nhnt11.com/DSC07910.jpg',
  'https://cdn.nhnt11.com/DSC07914.jpg',
  'https://cdn.nhnt11.com/DSC08059.jpg',
];
