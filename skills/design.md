---
name: design
version: 1
---

# Visual Design & Design Systems

Build and audit design systems, design tokens, typography, color, spacing, component libraries, and CSS architecture.

## When to use this skill

- User wants to set up or extend a design system
- User asks about design tokens, CSS variables, or theming
- User wants consistent spacing, typography, or color usage across a project
- User asks about Tailwind configuration, CSS architecture (BEM, ITCSS, utility-first)
- User wants to add or support dark mode
- User mentions Figma, Storybook, or component documentation
- User wants to audit visual inconsistencies across a UI

## Procedure

### Step 1: Audit existing design decisions

Before introducing anything new, map what already exists:
```bash
# Find CSS custom properties (design tokens)
grep -rn "^  --" src/ --include="*.css" --include="*.scss" | head -30

# Find hardcoded colors (potential tokens)
grep -rn "#[0-9a-fA-F]\{3,6\}\|rgb(\|rgba(\|hsl(" src/ --include="*.css" --include="*.scss" --include="*.tsx" | head -20

# Find hardcoded spacing (potential tokens)
grep -rn "margin:\|padding:\|gap:" src/ --include="*.css" | grep -E "[0-9]+px" | head -20

# Check Tailwind config
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null
```

### Step 2: Design token architecture

Tokens should follow a three-tier structure:
1. **Primitive tokens** — raw values, no semantic meaning
2. **Semantic tokens** — named by purpose, reference primitives
3. **Component tokens** — specific to one component, reference semantic

```css
/* 1. Primitive tokens */
:root {
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --radius-md: 0.375rem;
}

/* 2. Semantic tokens */
:root {
  --color-primary: var(--color-blue-500);
  --color-primary-hover: var(--color-blue-600);
  --space-button-padding-x: var(--space-4);
  --radius-button: var(--radius-md);
}

/* 3. Component tokens (optional, for complex components) */
.card {
  --card-padding: var(--space-6);
  --card-radius: var(--radius-md);
}
```

### Step 3: Typography system

A well-defined type scale has:
- 5–8 size steps (following a ratio: 1.25, 1.333, or 1.5)
- Defined line-height per size (larger text = tighter line-height)
- Maximum content width: 60–75 characters per line (`max-width: 65ch`)
- Correct font-weight usage (not just bold/normal)

```css
:root {
  --font-size-xs:   0.75rem;   /* 12px */
  --font-size-sm:   0.875rem;  /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg:   1.125rem;  /* 18px */
  --font-size-xl:   1.25rem;   /* 20px */
  --font-size-2xl:  1.5rem;    /* 24px */
  --font-size-3xl:  1.875rem;  /* 30px */
  --font-size-4xl:  2.25rem;   /* 36px */
}
```

Check font loading:
```bash
grep -rn "font-family\|@font-face\|font-display" src/ public/ --include="*.css" | head -10
```

### Step 4: Color system

Every color system needs:
1. **Brand palette**: primary, secondary, accent
2. **Semantic colors**: success (green), warning (yellow/amber), danger (red), info (blue)
3. **Neutral scale**: 8–12 steps from white to black (gray-50 through gray-950)
4. **Surface colors**: background, foreground, border, overlay

Contrast requirements (WCAG AA):
- Normal text (< 18pt): ≥ 4.5:1
- Large text (≥ 18pt or bold ≥ 14pt): ≥ 3:1
- UI components and icons: ≥ 3:1

```bash
# Test contrast programmatically
node -e "
const l = (hex) => {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const toLinear = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126*toLinear(r) + 0.7152*toLinear(g) + 0.0722*toLinear(b);
};
const contrast = (fg, bg) => {
  const l1 = Math.max(l(fg), l(bg)), l2 = Math.min(l(fg), l(bg));
  return ((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
};
// Example:
console.log('Contrast ratio:', contrast('#1e293b', '#f8fafc'));
"
```

### Step 5: Spacing system

Use a consistent scale. Options:
- **4px base** (Tailwind default): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64...
- **8px base**: 8, 16, 24, 32, 48, 64, 96...

Check for inconsistencies:
```bash
# Find spacing values not on the scale
grep -rn "margin\|padding\|gap" src/ --include="*.css" --include="*.scss" | grep -E "[0-9]+(px)" | grep -vE "(0px|4px|8px|12px|16px|20px|24px|32px|40px|48px|64px|80px|96px)" | head -10
```

### Step 6: Dark mode

If dark mode is needed:
1. Use CSS custom properties (design tokens) — never hardcode colors
2. Use `prefers-color-scheme` media query OR data attribute (`data-theme="dark"`)
3. Every semantic token needs a light and dark value

```css
:root {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0f172a;
    --color-foreground: #f8fafc;
    --color-surface: #1e293b;
    --color-border: #334155;
  }
}
```

### Step 7: Component documentation (Storybook)

For any component with variants:
```bash
npx storybook init  # if not set up
npm run storybook   # start dev server
```

Every component story should cover:
- Default state
- All variants (size, color, style)
- Interactive states (hover, focus, active, disabled)
- Edge cases (long text, empty content, error state)

## Common patterns

### Tailwind: extend the theme, don't override
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {  // ← extend, not replace
      colors: {
        brand: { 500: '#6366f1', 600: '#4f46e5' },
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

### CSS custom properties for theming
```css
/* Use in components */
.button-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: var(--space-button-padding-y) var(--space-button-padding-x);
  border-radius: var(--radius-button);
}
```

## Red flags to report

- Hardcoded hex colors in component files (should be token references)
- Multiple slightly-different grays with no systematic relationship
- Spacing values that don't follow any grid (e.g., 7px, 11px, 22px)
- No dark mode support despite the project targeting multiple contexts
- Font loaded without `font-display: swap` (causes invisible text while loading)
- Text color that doesn't meet 4.5:1 contrast on its background
- No Storybook or isolated component documentation for a UI library
- Design decisions made in multiple places (no single source of truth)
- CSS specificity wars — overrides piled on overrides instead of a clean architecture
