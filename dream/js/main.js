// Entry point - initializes glitch text and WebGL visuals

Glitch.init();
Visuals.init();
Secrets.init();

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
    separation: separationFn
  };
})();
