# Agent Guidelines for nhnt11.com

Read `soul.md` first. It defines everything about this site's philosophy, code principles, and design decisions.

## File Structure

```
/
├── index.html              # Main landing page
├── styles.css              # Shared styles with design tokens
├── js/
│   ├── constants.js        # Timing, layout, image URLs
│   ├── gallery.js          # Background image cycling
│   ├── parallax.js         # Mouse-based movement (desktop)
│   ├── pan.js              # Touch-based panning (mobile)
│   ├── vignette.js         # Dynamic shadows around text
│   └── main.js             # Entry point, initialization
├── dream/
│   ├── index.html          # Psychedelic experience page
│   └── js/
│       ├── glitch.js       # Text glitch effect
│       ├── shaders.js      # Common GLSL code
│       ├── effects.js      # Visual effects library
│       ├── visuals.js      # WebGL renderer
│       └── main.js         # Entry point
├── soul.md                 # Design philosophy
└── CLAUDE.md               # This file
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
