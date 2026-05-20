---
name: ux-ui
version: 1
---

# UX/UI Design

Evaluate, design, and improve user experiences and interfaces — from user flows and information architecture to interaction design and accessibility.

## When to use this skill

- User asks for UX review or design feedback
- User wants to redesign a screen, flow, or page
- User mentions "user experience", "usability", "wireframe", "prototype", "user journey"
- User asks about onboarding, empty states, error messages, or loading states
- User wants to improve conversion, retention, or task completion rates
- User mentions accessibility, WCAG, or screen readers
- User asks "does this make sense to users?" or "why are users dropping off?"

## Procedure

### Step 1: Understand the user and goal

Before any design work, establish:
1. **Who is the user?** (technical/non-technical, age range, device, context of use)
2. **What are they trying to accomplish?** (primary task, frequency, stakes)
3. **What does success look like?** (task completed, decision made, info found)
4. **What are the constraints?** (platform, existing brand, tech stack, timeline)

If the user hasn't provided this context, ask for it. Design without user context produces decoration, not UX.

### Step 2: Map the user journey

Before designing any individual screen:
1. List every step from the user's entry point to their goal
2. Identify what information/decisions are needed at each step
3. Mark where users can fail, get confused, or abandon
4. Note what the system needs to provide at each step (feedback, guidance, confirmation)

```
Entry → [step 1] → [decision point] → [step 2] → Goal
                         ↓
                     Error path → Recovery
```

### Step 3: Evaluate information architecture

- Is the primary action obvious? (One clear CTA per screen)
- Are related things grouped together?
- Is navigation predictable? (can the user always answer "where am I?" and "how do I get back?")
- Is the information hierarchy reflected in the visual hierarchy?
- Are labels self-explanatory without tooltips?

### Step 4: Review interaction design

Check each interactive element:
- **Affordance**: does it look clickable/interactive?
- **Feedback**: does the user know what happened after they act?
- **Recovery**: can mistakes be undone?
- **Consistency**: does the same action always look/work the same way?
- **Efficiency**: how many clicks/taps to complete the task? Can power users shortcut?

### Step 5: Identify friction points

Common UX problems to look for:
- **Too many steps**: can steps be merged or eliminated?
- **Ambiguous labels**: "Submit", "Continue", "Confirm" — which one does what?
- **Missing empty states**: what does the user see when there's no data yet?
- **Unhelpful errors**: "Something went wrong" vs. "Email already in use — sign in instead"
- **No loading feedback**: does the user know the app is working?
- **Dead ends**: is there always a path forward, even from error states?

### Step 6: Accessibility review

- **Color contrast**: ≥ 4.5:1 for text (WCAG AA), ≥ 3:1 for large text and UI components
- **Focus management**: keyboard focus visible, logical tab order, no focus traps
- **Screen readers**: all interactive elements have accessible names, images have alt text
- **Motion**: animations respect `prefers-reduced-motion`
- **Touch targets**: minimum 44×44px for mobile interactive elements

Tools to check contrast: `npx @accessibility-checker/core` or browser DevTools

### Step 7: Propose improvements

Structure feedback as:
1. **What the current state is** (observation, not judgment)
2. **What the problem is** (from the user's perspective)
3. **What to do instead** (specific, actionable)
4. **Tradeoffs** (if applicable)

For significant changes, propose 2–3 alternatives with different tradeoff profiles.

## Common patterns

### Effective error messages
```
Bad:  "Invalid input"
Good: "Email address must include @. Example: name@domain.com"

Bad:  "Error 403"
Good: "You don't have permission to view this page. Contact your admin or sign in with a different account."
```

### Empty states (don't leave users stranded)
```
[Icon]
No projects yet
Create your first project to get started.
[+ New Project]
```

### Loading states (set expectations)
- < 100ms: no indicator needed
- 100ms–1s: spinner
- > 1s: progress indicator or skeleton screen with estimated time

## Red flags to report

- Primary action is not the most visually prominent element
- Error messages that blame the user or don't explain how to fix the problem
- Form fields with no labels (placeholder text only)
- Confirmation dialogs with "OK" / "Cancel" — these should say what will happen
- Destructive actions with no confirmation or undo
- More than 3 levels of navigation depth for common tasks
- Touch targets smaller than 44px on mobile
- Information presented only via color (e.g., red = required, with no other indicator)
- Auto-advancing carousels without pause control (accessibility violation)
