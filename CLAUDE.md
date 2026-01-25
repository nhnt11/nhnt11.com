# Agent Guidelines for nhnt11.com

Read `soul.md` before making any changes. It defines the essence of this site.

## Mandatory Constraints

### No Dependencies
- No npm packages, no node_modules, no package.json
- No build tools (webpack, vite, parcel, etc.)
- No CSS preprocessors (sass, less, postcss)
- No JavaScript transpilers (babel, typescript)
- No frameworks (react, vue, svelte, etc.)

### No External Services
- No analytics (google analytics, plausible, etc.)
- No tracking pixels or beacons
- No third-party APIs that require runtime calls
- No authentication services
- Exception: CDN-hosted static assets (fonts, images) are acceptable

### Static Files Only
- Everything must work by opening HTML files directly or serving from any static host
- No server-side rendering, no edge functions, no serverless
- All state lives in the DOM, localStorage, or URL

## Code Style

### HTML
- Semantic elements where meaningful, divs where not
- No class soup. One or two classes per element maximum
- Inline scripts at the bottom of body, not in head
- No data attributes for styling hooks

### CSS
- All styles in `styles.css` (exception: page-specific styles can be in `<style>` if truly isolated)
- No utility classes. Write descriptive selectors
- Use CSS custom properties for values that repeat
- Prefer `rem` for typography, `px` for borders/shadows, `%` or `vw/vh` for layout
- Animations use `ease-out` or `ease-in-out`. Never linear for UI motion

### JavaScript
- Vanilla JS only. Modern ES6+ features are fine
- No classes unless genuinely modeling objects. Functions are usually enough
- Query selectors at the top of scripts, not scattered throughout
- Use `const` by default, `let` when mutation is required, never `var`
- Comments explain *why*, not *what*

### WebGL/Shaders
- GLSL code lives in template literals within the HTML file
- Share common functions via a `glslCommon` string
- Parameters should be randomized within aesthetic bounds
- Always handle edge cases (division by zero, out-of-bounds UV)

## Design Decisions

### When Adding Visual Elements
- Does it need to exist? Remove before you add
- Black (`#000`) is the default background
- White text at 85-95% opacity
- Geist Mono is the typeface. Weight 300 for body, 400-500 for emphasis
- Transitions are 1-2 seconds with ease-out curves
- No hard edges. Use gradients, blurs, opacity

### When Adding Interactions
- Keyboard shortcuts for power users (document in debug mode if hidden)
- Touch gestures should feel physical
- Click/tap reveals hidden depth, doesn't navigate
- No modals, no popups, no overlays that block content

### When Adding Pages
- Each page is self-contained HTML
- Link from nav only if it's a primary destination
- Hidden pages (like /dream) are discoverable, not advertised

## The Test

Before committing changes, verify:

1. Does it work with no build step? (open the HTML file directly)
2. Does it work offline? (no runtime API calls)
3. Does it work without JavaScript? (core content visible)
4. Will it work in 10 years? (no dependencies to break)
5. Is it honest? (no dark patterns, no manipulation)

## File Structure

```
/
├── index.html          # Main landing page
├── styles.css          # Shared styles
├── soul.md             # Design philosophy (read this)
├── CLAUDE.md           # This file
└── dream/
    └── index.html      # Psychedelic experience page
```

New pages go in their own directory with an `index.html` for clean URLs.

## What Not To Do

- Don't add package.json or any config files for build tools
- Don't create README.md or documentation beyond soul.md
- Don't add meta tags for social cards or SEO optimization
- Don't add favicons, manifests, or PWA features
- Don't add comments sections, share buttons, or social integrations
- Don't "improve" code style with linters or formatters
- Don't refactor working code for abstract "cleanliness"
- Don't add error tracking, logging, or monitoring
