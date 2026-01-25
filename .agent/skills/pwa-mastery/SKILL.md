---
name: PWA Mastery
description: Expert guidelines for building, debugging, and optimizing Progressive Web Apps.
---

# PWA Mastery Skill

This skill provides comprehensive instructions for handling Progressive Web App (PWA) development, specifically focusing on mobile UX, safe area insets, and installability.

## Core Principles
- **Progressive Enhancement**: Ensure the app works perfectly as a website first, then add PWA magic.
- **App-Like Feel**: Use transitions, splash screens, and safe areas to mimic native app behavior.
- **Reliability**: Service workers should handle caching and offline modes gracefully.

## Mobile Layout & Safe Areas
When building PWAs for mobile (especially iOS), you must account for the notch and status bar.
- **Viewport**: Always use `viewport-fit=cover` in your `<meta name="viewport" ...>`.
- **CSS Variables**: Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to adjust padding/margins.
- **Dynamic Padding**:
  ```css
  padding-top: calc(env(safe-area-inset-top) + 16px);
  ```

## Service Worker Management
- **Registration**: Register the service worker in the main `layout.tsx` or `_app.tsx`.
- **Updates**: Implement a mechanism to notify users when a new version is available.
- **Caching**: Strategically cache assets (fonts, icons, core JS) while keeping API responses dynamic.

## Installation & Prompts
- **Manifest**: Ensure `manifest.json` has all required fields (name, icons, display mode).
- **Custom Prompts**: Don't rely solely on browser defaults. Use a non-intrusive banner (like the one in this project) to guide users.
- **Event Handling**: Listen for `beforeinstallprompt` to store the event and show your custom UI.

## Debugging
- Use Chrome DevTools "Application" tab to inspect the Manifest and Service Workers.
- Test "Standalone" mode using the browser's device simulator.
- For iOS, debugging requires an actual device or Mac Safari's web inspector.
