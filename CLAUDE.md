# Agent Guidelines for nhnt11.com

Read `soul.md` first. It defines everything about this site's philosophy, code principles, and design decisions.

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
