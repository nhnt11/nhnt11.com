# Soul

This document defines the essence of nhnt11.com. Every decision—code, design, interaction—flows from these principles.

## Core Values

**Minimalist** — Only what matters. No clutter, no noise, no excess. Every element earns its place.

**Hardcore** — No frameworks, no build steps, no servers. Raw HTML, CSS, JavaScript. If the browser can do it natively, we use that. Complexity is not sophistication.

**Philosophical** — The site is a meditation, not a billboard. It invites contemplation. Space to breathe. Room to wonder.

**Static** — Files on a disk, served as-is. No database, no API, no runtime. It will outlive any platform.

**Tasteful** — Restraint over spectacle. Elegance over flash. The impressive thing is what's *not* there.

**Open** — Hidden depths for those who look. Keyboard shortcuts, click-to-reveal, debug modes. Rewards for the curious.

**Inviting** — Warm despite the minimalism. The photography breathes life. The typography is comfortable. It welcomes you.

**Audacious** — Bold choices, held with conviction. Full-bleed photography. Procedural psychedelia. Glitch aesthetics. Unapologetically itself.

**Immersive** — The browser window disappears. You're inside the experience, not looking at a website.

**Responsive** — Mobile, tablet, and desktop are all first-class citizens. Not "mobile-first" or "desktop-first"—device-appropriate. Each form factor gets the experience it deserves: touch devices get touch interactions, pointer devices get pointer interactions, small screens get appropriately sized typography and spacing. Feature detection over viewport assumptions.

**Learnable** — The file structure is documentation. Someone should understand what the site does just by looking at the directory tree. `gallery.js` handles the gallery. `parallax.js` handles parallax. `glitch.js` handles glitch. No mystery, no indirection.

---

## Code Principles

### Architecture
- **Zero dependencies** in production. No npm, no bundlers, no transpilers.
- **Descriptive file structure**. Each script does one thing, named for what it does. The directory tree tells the story.
- **Shared styles** in one stylesheet. No CSS-in-JS, no utility classes.
- **No build step**. What you write is what ships.
- **Works offline**. Static assets, client-side only.

### JavaScript
- **Vanilla only**. Modern browser APIs are powerful enough.
- **Progressive enhancement**. Core content works without JS. Interactions layer on top.
- **No abstractions for their own sake**. Write the code that solves the problem.
- **State in the DOM or localStorage**. No state management libraries.
- **Feature detection over browser sniffing**. `matchMedia`, capability checks.

### Performance
- **Perceived speed over benchmarks**. Preload intelligently. Transition smoothly. Never flash or jank.
- **Lazy load judiciously**. First paint matters most.
- **GPU acceleration for visuals**. WebGL for heavy lifting. CSS transforms for the rest.
- **Respect the device**. Detect touch vs pointer. Adapt, don't assume.

### Resilience
- **Fail gracefully**. Missing image? Show black. WebGL unsupported? Degrade.
- **No external runtime dependencies**. Google Fonts are acceptable; Google APIs are not.
- **URLs are forever**. Once published, a path stays valid.

---

## Art Principles

### Visual Language
- **Black is the canvas**. `#000` default. Content emerges from darkness.
- **White is the voice**. Text in `rgba(255, 255, 255, 0.85-0.95)`. Soft, not stark.
- **Photography is primary**. Full-bleed, high-resolution, carefully composed. The photos *are* the design.
- **Typography is monospace**. Geist Mono. Weight 300-500. Technical, human, readable.
- **No icons**. Words are sufficient. If an icon is needed, the design is wrong.

### Motion
- **Slow transitions**. 1-2 seconds for major changes. Time to register, not to wait.
- **Ease-out curves**. Quick start, gentle landing. Natural deceleration.
- **Parallax with purpose**. Subtle depth, not gimmick. Enhances immersion.
- **Crossfades over cuts**. Dissolve between states. Honor what came before.

### Interaction
- **Discoverable, not obvious**. The UI doesn't shout. Curious users find more.
- **Keyboard-first for power users**. Arrow keys, tilde toggles, number keys.
- **Touch-native for mobile**. Gestures that feel physical—drag, pan, tap edges.
- **Click-to-reveal**. The default hides nothing, but invites exploration.

### Atmosphere
- **Vignettes for focus**. Draw the eye to content. Soften the edges.
- **No hard borders**. Gradients, blurs, opacity. Elements breathe into each other.
- **Light blooms, not glows**. Soft luminosity. Nothing neon unless intentionally psychedelic.

---

## The /dream Space

A separate realm. The rules bend here.

- **Procedural, not recorded**. WebGL shaders generate everything. No video files.
- **Randomized within bounds**. Each visit is unique. Parameters vary, essence stays.
- **Text as window**. Letters cut through the overlay, revealing chaos beneath.
- **Glitch as language**. Distortion communicates. Slices shift, fonts mutate, stability is illusion.
- **Fonts can break character**. Rubik Glitch, Shrikhand, Fascinate Inline. Expressive, not functional.
- **Debug mode for the dedicated**. Tilde reveals the machinery. Adjust parameters. Switch effects. Peek behind the curtain.

---

## What We Don't Do

- No analytics tracking visitors
- No cookie banners or consent popups
- No newsletter signups or lead capture
- No comments or social integrations
- No hamburger menus or modal dialogs
- No loading skeletons or placeholder shimmer
- No "hero sections" or "calls to action"
- No SEO-bait or keyword stuffing
- No A/B testing or conversion optimization
- No accessibility theater (but genuine accessibility: yes)

---

## The Test

Before adding anything, ask:

1. **Does it serve the visitor or the creator's ego?**
2. **Could it be removed without loss?**
3. **Will it still work in 10 years?**
4. **Does it respect the viewer's time and attention?**
5. **Is it honest?**

If any answer is wrong, don't add it.

---

*The goal is not to impress. The goal is to resonate.*
