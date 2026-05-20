---
name: frontend
version: 1
---

# Frontend Engineering

Build, review, and debug frontend code across React, Vue, Angular, Svelte, HTML/CSS, and TypeScript.

## When to use this skill

- User is building or fixing UI components, pages, or layouts
- User mentions React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, or similar
- User asks about state management (Redux, Zustand, Pinia, MobX)
- User wants to fix styling, layout, or responsiveness issues
- User mentions "component", "hook", "props", "CSS", "SCSS", "Tailwind"
- User asks about bundle size, lazy loading, or frontend performance
- User wants to improve accessibility (a11y) or keyboard navigation

## Procedure

### Step 1: Understand the stack

Before writing any code, check:
- What framework is in use? (package.json dependencies)
- What styling approach? (CSS modules, Tailwind, styled-components, SCSS, plain CSS)
- What state management? (Redux, Zustand, Context, Pinia, Vuex)
- What build tool? (Vite, webpack, Parcel, Turbopack)
- What TypeScript version and strictness?

```bash
cat package.json | grep -E '"(react|vue|angular|svelte|next|nuxt|vite|webpack)"'
```

### Step 2: Inspect existing conventions

Match the patterns already in use — do not introduce a new pattern if one exists:
- Read 2–3 existing components before creating a new one
- Check how props are typed (interfaces vs. types, optional vs. required)
- Check how events/callbacks are named (onClick, handleClick, onSubmit)
- Check import paths and alias conventions

### Step 3: Component design

- **Single responsibility**: each component does one thing. If it needs a title, a helper, break it up.
- **Props API**: prefer explicit over implicit. Avoid spreading `...rest` unless building a wrapper.
- **Co-location**: keep styles, tests, and types near the component they belong to.
- **Composition over configuration**: prefer composable children over complex prop-driven logic.

### Step 4: Styling

- Never use inline styles for layout or theme values — use tokens or utility classes.
- Check for hardcoded pixel values that should reference spacing/typography tokens.
- Verify responsive breakpoints match the project's grid system.
- Test dark mode if the project supports it.

### Step 5: Accessibility (a11y)

Every interactive element must:
- Be reachable via keyboard (Tab, Enter, Space, Escape)
- Have an accessible name (aria-label, aria-labelledby, or visible text)
- Have correct ARIA roles if using non-semantic elements
- Maintain visible focus state (no `outline: none` without alternative)

Color contrast: minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA).

### Step 6: Performance

Check for:
- Components re-rendering unnecessarily (missing `React.memo`, `useMemo`, `useCallback`)
- Large lists rendered without virtualization (use `react-virtual`, `vue-virtual-scroll`)
- Images without explicit width/height causing layout shift
- Heavy dependencies imported at the top level (use dynamic import for lazily needed code)
- Event listeners attached without cleanup in `useEffect`/`onUnmounted`

### Step 7: Testing

For any new component, add at minimum:
- A smoke test (renders without crashing)
- A behavior test (key interaction works)
- An accessibility test (axe or jest-axe)

Check test coverage:
```bash
npx jest --coverage --collectCoverageFrom='src/components/**' 2>&1 | tail -20
```

## Common patterns

### React: data fetching with error/loading states
```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUser(userId);
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <ProfileCard user={data} />;
}
```

### Vue 3: composable for async state
```ts
export function useAsync<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);
  const execute = async () => {
    loading.value = true;
    try { data.value = await fn(); }
    catch (e) { error.value = e as Error; }
    finally { loading.value = false; }
  };
  return { data, error, loading, execute };
}
```

## Red flags to report

- `any` types in TypeScript without justification
- `dangerouslySetInnerHTML` or `v-html` with user-supplied content (XSS risk)
- Direct DOM manipulation inside framework components
- `useEffect` with missing or incorrect dependency arrays
- Global state mutated directly (not via store actions)
- Console logs left in production code
- Bundle importing entire libraries when only one function is needed (e.g., `import _ from 'lodash'`)
