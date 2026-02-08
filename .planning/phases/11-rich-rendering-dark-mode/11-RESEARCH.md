# Phase 11: Rich Rendering & Dark Mode - Research

**Researched:** 2026-02-08
**Domain:** React markdown rendering with syntax highlighting and Next.js dark mode
**Confidence:** HIGH

## Summary

Rich markdown rendering and dark mode implementation in Next.js are well-established domains with mature libraries and clear best practices. The standard stack for markdown rendering is `react-markdown` with `remark-gfm` for tables and `react-syntax-highlighter` for code blocks. For dark mode, `next-themes` is the de facto solution for Next.js applications, providing system preference detection and FOUC prevention.

The SoulPrint project already has `next-themes` installed and Tailwind configured with `darkMode: ["class"]`, plus CSS variables defined for both light and dark themes in `globals.css`. However, the layout is hardcoded to `className="dark"`, and message rendering uses a basic custom formatter rather than a proper markdown library.

**Primary recommendation:** Use react-markdown with remark-gfm (tables), rehype-sanitize (security), and react-syntax-highlighter/Prism (syntax highlighting). Integrate next-themes ThemeProvider in the root layout and create a theme toggle component. Replace the custom MessageContent formatter with a secure markdown renderer.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 9.x | Markdown rendering | Official React markdown renderer, converts MD tokens to React elements (no dangerouslySetInnerHTML), 18M+ weekly downloads |
| remark-gfm | 4.x | GitHub-flavored markdown | Adds tables, task lists, strikethrough - required for table support |
| rehype-sanitize | 6.x | XSS prevention | Sanitizes HTML content, blocks javascript: links, whitelists safe elements |
| react-syntax-highlighter | 15.x | Syntax highlighting | 3M+ weekly downloads, supports Prism/Highlight.js, inline styles for SSR |
| next-themes | 0.4.x | Dark mode for Next.js | System preference detection, no FOUC, 1M+ weekly downloads, handles SSR |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| remark-breaks | 4.x | Soft line breaks | If you want single newlines to create `<br>` tags |
| rehype-raw | 7.x | Render raw HTML | Only if you need trusted HTML sources (with rehype-sanitize) |
| hast-util-sanitize | 5.x | Custom sanitization schemas | If you need finer control than rehype-sanitize defaults |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-syntax-highlighter | prism-react-renderer | Smaller bundle, but less maintained (last update 2023) |
| react-syntax-highlighter | shiki/react-shiki | Better syntax accuracy, dual-theme support, but slower and larger bundle |
| next-themes | Manual implementation | More control, but requires solving FOUC, SSR hydration, system preference yourself |
| Prism (in react-syntax-highlighter) | Highlight.js | Highlight.js has more languages, but Prism is 9% faster and has better JSX/TSX support |

**Installation:**
```bash
npm install react-markdown remark-gfm rehype-sanitize react-syntax-highlighter
# next-themes already installed in SoulPrint
```

## Architecture Patterns

### Recommended Project Structure
```
components/
├── chat/
│   ├── message-content.tsx        # Replace with markdown renderer
│   ├── code-block.tsx             # Syntax highlighter with copy button
│   └── telegram-chat-v2.tsx       # Update to use theme hook
├── theme/
│   ├── theme-provider.tsx         # next-themes wrapper
│   └── theme-toggle.tsx           # Toggle button component
app/
├── layout.tsx                     # Add ThemeProvider, remove hardcoded "dark"
└── globals.css                    # Already has CSS variables defined
```

### Pattern 1: Secure Markdown Rendering
**What:** Use react-markdown with plugins for features and security
**When to use:** Rendering any user-generated or AI-generated content
**Example:**
```typescript
// components/chat/message-content.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { CodeBlock } from './code-block';

export function MessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <CodeBlock
              language={match[1]}
              value={String(children).replace(/\n$/, '')}
            />
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### Pattern 2: Syntax Highlighting with Theme Awareness
**What:** Use react-syntax-highlighter with dynamic theme selection
**When to use:** Code blocks that need to match app theme
**Example:**
```typescript
// components/chat/code-block.tsx
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Copy, Check } from 'lucide-react';

export function CodeBlock({ language, value }: { language: string; value: string }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <SyntaxHighlighter
        language={language}
        style={theme === 'dark' ? vscDarkPlus : vs}
        customStyle={{ margin: 0, borderRadius: '0.5rem' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
```

### Pattern 3: next-themes Integration
**What:** Add ThemeProvider to layout and create theme controls
**When to use:** Root layout setup, one-time configuration
**Example:**
```typescript
// components/theme/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// app/layout.tsx
import { ThemeProvider } from '@/components/theme/theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Pattern 4: Theme Toggle with System Preference
**What:** Toggle between light, dark, and system themes
**When to use:** Settings panel or header
**Example:**
```typescript
// components/theme/theme-toggle.tsx
'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex gap-2">
      <button onClick={() => setTheme('light')} aria-label="Light mode">
        <Sun className={theme === 'light' ? 'text-orange-600' : 'text-gray-400'} />
      </button>
      <button onClick={() => setTheme('dark')} aria-label="Dark mode">
        <Moon className={theme === 'dark' ? 'text-orange-600' : 'text-gray-400'} />
      </button>
      <button onClick={() => setTheme('system')} aria-label="System theme">
        <Monitor className={theme === 'system' ? 'text-orange-600' : 'text-gray-400'} />
      </button>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Hard-coding theme in HTML tag:** Breaks user preference and system detection. Always use next-themes with dynamic class application.
- **Not using suppressHydrationWarning on html tag:** Causes console warnings during SSR when next-themes injects the theme script.
- **Using useTheme without mounted check:** Causes hydration mismatches because server doesn't know client theme. Always guard with `useEffect(() => setMounted(true), [])`.
- **Overriding all markdown elements with custom components:** Breaks separation of concerns and makes styling difficult. Only override what you need (code blocks, links for security).
- **Loading full Prism/Highlight.js bundles:** Bloats bundle size. Use dynamic imports or tree-shaking: `import { Prism } from 'react-syntax-highlighter'` and import styles from `/dist/cjs/` for Next.js compatibility.
- **Putting theme-dependent code directly in server components:** Will cause hydration errors. Use 'use client' directive for theme-aware components.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown to React | Custom parser with dangerouslySetInnerHTML | react-markdown | Handles edge cases, security, extensibility, and converts to React elements (not HTML strings) |
| Syntax highlighting | Regex-based token matching | react-syntax-highlighter or Shiki | Hundreds of language grammars, correct precedence, edge cases like nested strings/comments |
| XSS in markdown | Custom sanitization logic | rehype-sanitize | Whitelists safe elements, strips javascript: links, filters event handlers, handles ARIA attributes correctly |
| Dark mode theme management | localStorage + class toggling | next-themes | Solves FOUC, SSR hydration, system preference detection, and storage automatically |
| Copy to clipboard | document.execCommand fallback | navigator.clipboard.writeText | Modern API with better permissions, async, and mobile support |
| GFM table parsing | String splitting and rendering | remark-gfm | Handles alignment, edge cases, nested markdown in cells |

**Key insight:** Markdown rendering has countless edge cases (nested formatting, malformed syntax, security vectors). Libraries like react-markdown have battle-tested parsers. Similarly, dark mode in Next.js requires solving SSR hydration timing, which next-themes handles with an injected blocking script.

## Common Pitfalls

### Pitfall 1: FOUC (Flash of Unstyled Content) on Page Load
**What goes wrong:** Page briefly shows light theme before switching to dark, or wrong colors flash during hydration
**Why it happens:** Server doesn't know client's theme preference. React hydrates before theme is applied. Theme is applied after JavaScript loads.
**How to avoid:**
- Use `suppressHydrationWarning` on `<html>` tag (required for next-themes)
- Use `disableTransitionOnChange` prop in ThemeProvider to prevent CSS transition flicker
- next-themes injects a blocking script before hydration that reads localStorage/system preference and applies class immediately
- Never render theme-dependent UI in server components; use 'use client' with mounted guards
**Warning signs:** Users report seeing "white flash" on dark mode, hydration warnings in console, layout shift on load

### Pitfall 2: Hardcoded Colors Breaking Theme
**What goes wrong:** Some UI elements remain light in dark mode (invisible text, broken contrast)
**Why it happens:** Using hardcoded hex colors like `#FFFFFF` instead of CSS variables or Tailwind theme colors
**How to avoid:**
- Use Tailwind theme colors: `bg-background`, `text-foreground`, `border-border`
- CSS variables defined in `globals.css` with `.dark` overrides
- Audit all instances of hardcoded colors in components (search for `#`, `rgb(`, `rgba(`)
- Check `telegram-chat-v2.tsx` themes object - currently has hardcoded values that won't switch
**Warning signs:** User reports "can't read text in light mode", certain buttons/borders invisible in one theme

### Pitfall 3: SSR Hydration Mismatch with Theme
**What goes wrong:** React hydration error: "Text content does not match server-rendered HTML"
**Why it happens:** Rendering theme-dependent content (like "Dark mode" vs "Light mode" label) in server component where server doesn't know the theme
**How to avoid:**
- Always use 'use client' directive for components using `useTheme()`
- Add mounted state check: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); if (!mounted) return null;`
- This returns null on server, only renders after client hydration
**Warning signs:** Console errors about hydration mismatch, theme toggle shows wrong initial state, content "jumps" on page load

### Pitfall 4: Code Block Theme Not Switching
**What goes wrong:** Syntax highlighting stays in light theme even when app is dark
**Why it happens:** Passing static theme to react-syntax-highlighter instead of dynamic based on `useTheme()`
**How to avoid:**
- Import both light and dark themes: `import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/cjs/styles/prism'`
- Use conditional: `style={theme === 'dark' ? vscDarkPlus : vs}`
- CodeBlock component must be 'use client' to use `useTheme()` hook
**Warning signs:** Code blocks don't update when theme toggles, light code blocks in dark mode

### Pitfall 5: XSS via Unsanitized Markdown
**What goes wrong:** Malicious markdown injects scripts or steals data via javascript: links
**Why it happens:** Using react-markdown without rehype-sanitize, or allowing raw HTML without sanitization
**How to avoid:**
- Always include `rehypeSanitize` in `rehypePlugins` array
- Default schema blocks `<script>`, `javascript:` links, event handlers (`onclick`, `onerror`)
- If using `rehype-raw` (for trusted HTML), MUST pair with `rehypeSanitize`
- Test with malicious inputs: `[Click me](javascript:alert('xss'))`, `<img src=x onerror=alert('xss')>`
**Warning signs:** Security audit finds executable code in markdown, links have javascript: protocols, inline event handlers present

### Pitfall 6: Next.js Import Path for react-syntax-highlighter
**What goes wrong:** Build fails with "Module not found" or runtime errors about ESM/CJS mismatch
**Why it happens:** Next.js requires CommonJS imports from `/dist/cjs/` not `/dist/esm/`
**How to avoid:**
- Import styles from `react-syntax-highlighter/dist/cjs/styles/prism` NOT `dist/esm`
- Import Prism from `react-syntax-highlighter/dist/cjs/prism` if using default exports
- Applies to all theme imports
**Warning signs:** Dev server works but production build fails, ESM-related errors in build output

### Pitfall 7: Copy Button Not Working on Mobile/HTTPS
**What goes wrong:** Copy button fails silently, clipboard.writeText() throws error
**Why it happens:** `navigator.clipboard` requires HTTPS (or localhost). Mobile Safari has additional permission requirements.
**How to avoid:**
- Always use HTTPS in production (Vercel does this automatically)
- Wrap in try-catch with fallback: `try { await navigator.clipboard.writeText() } catch { /* show error */ }`
- Test on actual mobile devices, not just desktop DevTools mobile mode
- Consider fallback to `document.execCommand('copy')` for older browsers (though deprecated)
**Warning signs:** Copy works on desktop but not mobile, copy fails on HTTP but works on HTTPS

## Code Examples

Verified patterns from official sources and community best practices:

### XSS-Safe Markdown Rendering
```typescript
// Secure markdown with tables, sanitization, and custom code blocks
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeSanitize]}
  components={{
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CodeBlock language={match[1]} value={String(children)} />
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    a({ node, children, href, ...props }) {
      // Additional safety: block javascript: links at render time
      if (href?.startsWith('javascript:')) return <>{children}</>;
      return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
  }}
>
  {content}
</ReactMarkdown>
```

### Theme-Aware Syntax Highlighting
```typescript
// Code block with copy button and theme switching
'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export function CodeBlock({ language, value }: { language: string; value: string }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="relative group my-4">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 px-2 py-1 bg-muted/80 hover:bg-muted rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <SyntaxHighlighter
        language={language}
        style={theme === 'dark' ? vscDarkPlus : vs}
        customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.875rem' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
```

### FOUC-Free Theme Provider Setup
```typescript
// app/layout.tsx - Prevent flash of unstyled content
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// components/theme-toggle.tsx - Avoid hydration mismatch
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Return null on server, placeholder during SSR
  if (!mounted) {
    return <div className="w-10 h-10" />; // Prevent layout shift
  }

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '🌞' : '🌙'}
    </button>
  );
}
```

### Updating Existing MessageContent Component
```typescript
// Before (components/chat/message-content.tsx):
// Custom regex-based formatting with hardcoded color classes

// After (secure markdown rendering):
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { CodeBlock } from './code-block';

interface MessageContentProps {
  content: string;
  isUser?: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  return (
    <ReactMarkdown
      className="prose prose-sm dark:prose-invert max-w-none"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
          ) : (
            <code
              className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        a({ href, children }) {
          if (href?.startsWith('javascript:')) return <>{children}</>;
          return (
            <a
              href={href}
              className="text-orange-600 dark:text-orange-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| marked.js with dangerouslySetInnerHTML | react-markdown with React elements | 2020+ | Eliminates XSS risk, allows component customization, better tree-shaking |
| highlight.js directly | react-syntax-highlighter | 2018+ | React-friendly API, SSR support via inline styles, theme switching |
| Manual localStorage + class toggling | next-themes | 2021+ | Solves FOUC, SSR hydration, system preference in one package |
| CSS media queries only for dark mode | CSS variables + class-based theming | 2022+ | User control + system preference, no FOUC, easier maintenance |
| prism-react-renderer | react-syntax-highlighter or Shiki | 2024+ | prism-react-renderer unmaintained since 2023, ecosystem moved on |
| Single theme code blocks | Dynamic theme switching | 2024+ | Better UX, matches app theme automatically |

**Deprecated/outdated:**
- **marked.js for React:** Use react-markdown instead. marked produces HTML strings requiring dangerouslySetInnerHTML.
- **prism-react-renderer:** Archived, last update May 2023. Use react-syntax-highlighter or Shiki.
- **Manual dark mode with useEffect:** Use next-themes. Manual implementations always have FOUC or hydration issues.
- **document.execCommand('copy'):** Deprecated. Use navigator.clipboard.writeText() (requires HTTPS).
- **Inline styles for themes:** Use CSS variables with Tailwind. Better for maintenance and dynamic theming.

## Open Questions

Things that couldn't be fully resolved:

1. **Tailwind Typography (prose) integration with existing chat styling**
   - What we know: Tailwind prose classes provide sensible markdown defaults
   - What's unclear: Whether prose conflicts with SoulPrint's existing Telegram-style bubble design
   - Recommendation: Test prose classes in message bubbles, may need to disable some prose defaults or use custom component overrides

2. **Performance impact of syntax highlighting on long code blocks in chat**
   - What we know: react-syntax-highlighter can be resource-intensive for long code
   - What's unclear: What's considered "too long" for real-time chat rendering
   - Recommendation: Add line count threshold (e.g., >100 lines) to show "Click to expand" before rendering syntax highlighting

3. **Should theme toggle be per-conversation or global?**
   - What we know: Current chat UI has local theme state in telegram-chat-v2.tsx with hardcoded colors
   - What's unclear: Whether users expect theme to persist across sessions/devices or be conversation-specific
   - Recommendation: Use global theme with next-themes (standard UX pattern), remove local theme state from chat component

4. **Mobile Safari clipboard permissions timing**
   - What we know: Mobile Safari requires user gesture for clipboard.writeText
   - What's unclear: Whether button click always counts as user gesture in all iOS versions
   - Recommendation: Wrap in try-catch with user feedback, test on iOS 15, 16, 17 real devices

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS Dark Mode Documentation](https://tailwindcss.com/docs/dark-mode) - Official Tailwind dark mode configuration
- [next-themes GitHub Repository](https://github.com/pacocoursey/next-themes) - Official next-themes documentation
- [react-markdown GitHub Repository](https://github.com/remarkjs/react-markdown) - Official react-markdown docs
- [rehype-sanitize GitHub Repository](https://github.com/rehypejs/rehype-sanitize) - Official sanitization plugin
- [Strapi React Markdown Guide 2025](https://strapi.io/blog/react-markdown-complete-guide-security-styling) - Comprehensive security and styling guide

### Secondary (MEDIUM confidence)
- [How to Enable Tailwind CSS Dark Mode](https://prismic.io/blog/tailwind-css-darkmode-tutorial) - Next.js + Tailwind dark mode tutorial
- [Implementing Dark Mode in Next.js with Tailwind CSS](https://dev.to/chinmaymhatre/implementing-dark-mode-in-nextjs-with-tailwind-css-and-next-themes-a4e) - next-themes integration guide
- [Syntax Highlight Code in Markdown](https://amirardalan.com/blog/syntax-highlight-code-in-markdown) - react-syntax-highlighter with react-markdown
- [React Markdown Copy Code Button](https://blog.designly.biz/react-markdown-how-to-create-a-copy-code-button) - Copy to clipboard implementation
- [Fixing Dark Mode Flickering (FOUC) in React and Next.js](https://notanumber.in/blog/fixing-react-dark-mode-flickering) - FOUC prevention strategies
- [How to add tables to React Markdown](https://dev.to/letsbsocial1/how-to-add-tables-to-react-markdown-21lc) - remark-gfm usage

### Tertiary (LOW confidence)
- [react-syntax-highlighter Prism vs Highlight.js comparison](https://npm-compare.com/highlight.js,prismjs,react-syntax-highlighter,shiki) - Bundle size and performance comparisons
- [How I Finally Conquered Dark Mode in Next.js & Tailwind](https://medium.com/@giolvani/how-i-finally-conquered-dark-mode-in-next-js-tailwind-67c12c685fb4) - Community tutorial
- [Understanding & Fixing FOUC in Next.js App Router](https://dev.to/amritapadhy/understanding-fixing-fouc-in-nextjs-app-router-2025-guide-ojk) - Recent FOUC solutions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are well-established, 1M+ weekly downloads, official Next.js recommendations
- Architecture: HIGH - Patterns verified from official docs and multiple sources, already implemented in production apps
- Pitfalls: HIGH - Common issues documented in GitHub issues, Stack Overflow, and official troubleshooting guides
- XSS prevention: HIGH - Verified from official rehype-sanitize docs and security guides
- Dark mode implementation: HIGH - next-themes is de facto standard, patterns verified in official Tailwind + Next.js docs

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days - stable ecosystem, mature libraries, slow-moving best practices)
