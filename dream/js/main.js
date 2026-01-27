// Entry point - initializes glitch text, WebGL visuals, blob guide, and journey

Glitch.init();
Visuals.init();
Blob.init();
Journey.init();
Secrets.init();

// Mobile: request gyro permission on first touch (iOS 13+ requires user gesture)
if (typeof Blob !== 'undefined' && Blob.isMobileDevice()) {
  document.addEventListener('touchstart', async function onFirstTouch() {
    await Blob.requestGyroPermission();
    document.removeEventListener('touchstart', onFirstTouch);
  }, { once: true });
}

// Console experience
(function() {
  const banner = `
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     ██████╗ ██████╗ ███████╗ █████╗ ███╗   ███╗            │
│     ██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗ ████║            │
│     ██║  ██║██████╔╝█████╗  ███████║██╔████╔██║            │
│     ██║  ██║██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║            │
│     ██████╔╝██║  ██║███████╗██║  ██║██║ ╚═╝ ██║            │
│     ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  you found the console. here's what you can play with:     │
│                                                             │
│  dream.effects()        - list available effects           │
│  dream.effect('name')   - switch to effect                 │
│  dream.params()         - get current effect params        │
│  dream.param(k, v)      - tweak a parameter                │
│  dream.palette()        - randomize colors                 │
│  dream.glitch()         - trigger glitch                   │
│  dream.chaos()          - enter chaos mode                 │
│  dream.calm()           - exit chaos mode                  │
│                                                             │
│  dream.feedback()       - get feedback loop settings       │
│  dream.feedback({...})  - set feedback (amount/zoom/etc)   │
│  dream.feedback.toggle()- toggle feedback on/off           │
│                                                             │
│  dream.separation()     - get chromatic separation params  │
│  dream.separation({...})- set separation params            │
│                                                             │
│  dream.current()        - current effect name              │
│  dream.portal()         - secondary effect (portal)        │
│  dream.seed()           - get RNG seed (reproducible)      │
│  dream.seed(n)          - set RNG seed                     │
│  dream.newSeed()        - clear stored seed and reload     │
│                                                             │
│  dream.blob.position()  - get blob position                │
│  dream.blob.target(x,y) - set blob target                  │
│  dream.blob.mood('...')  - set mood (curious/purposeful/   │
│                          searching/peaceful)               │
│  dream.blob.visible()   - check if blob is visible         │
│                                                             │
│  press \` for debug overlay    |    konami code for chaos   │
│                                                             │
└─────────────────────────────────────────────────────────────┘`;

  console.log(banner);

  // Expose dream API
  const feedbackFn = function(opts) {
    if (opts === undefined) return Visuals.getFeedback();
    Visuals.setFeedback(opts);
  };
  feedbackFn.toggle = Visuals.toggleFeedback;

  const separationFn = function(opts) {
    if (opts === undefined) return Glitch.getSeparation();
    Glitch.setSeparation(opts);
  };

  window.dream = {
    effects: Visuals.getEffects,
    effect: Visuals.setEffect,
    params: Visuals.getParams,
    param: Visuals.setParam,
    palette: Visuals.randomizePalette,
    glitch: () => { Visuals.triggerGlitch(); Glitch.trigger(); },
    chaos: Visuals.enterChaosMode,
    calm: Visuals.exitChaosMode,
    feedback: feedbackFn,
    separation: separationFn,
    current: Visuals.getCurrentEffect,
    portal: () => Visuals.getSecondaryEffect().name,
    seed: (val) => val === undefined ? Visuals.getSeed() : Visuals.setSeed(val),
    newSeed: Visuals.clearSeedAndReload,
    blob: {
      position: Blob.getPosition,
      target: Blob.setTarget,
      mood: Blob.setMood,
      visible: Blob.isVisible,
      despawn: Blob.despawn,
      respawn: Blob.respawn
    },
    journey: {
      advance: Journey.advance,
      section: Journey.getCurrentSection,
      subsection: Journey.getCurrentSubsection,
      progress: Journey.getProgress,
      sections: Journey.getSections,
      jumpTo: Journey.jumpTo
    }
  };
})();
