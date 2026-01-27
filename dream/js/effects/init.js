// Effects registry and utilities
// Individual effect files add themselves to this object

const rand = (min, max) => min + RNG.next() * (max - min);

const EFFECTS = {};

// Re-export palette utilities from common.js for use in effects
