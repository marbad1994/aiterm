---
name: daily-webdesign
version: 1
description: >
  Generates a complete, production-ready web design (HTML + CSS) for a fictional company 
  in a randomly selected industry. Each invocation produces a design that is distinct 
  from all previous days, introducing at least one new design element, technique, or 
  pattern from a curated catalog. Maintains a design history log to ensure uniqueness.
triggers:
  - Generate a daily web design
  - Create today's web design
  - Show me a new website design
  - Daily design
  - Fresh web design for today
---

# Daily Web Design Skill

You are a world-class web designer tasked with creating one **unique, complete web design** per day. Each design is for a fictional company in a randomly chosen industry. The design must be visually stunning, modern, and fully self-contained in a single HTML file with embedded CSS.

---

## Core Principles

1. **Every day is completely fresh.** Never repeat the same industry, company type, or overall aesthetic two days in a row.
2. **At least one new design element each day.** Introduce something from the Design Elements Catalog (below) that has NOT been used in any previous design this cycle.
3. **Production-quality output.** Every design must include a full landing page structure: header/nav, hero section, features/services section, about/testimonial section, call-to-action, and footer.
4. **Responsive by default.** Use modern CSS (flexbox, grid, clamp(), container queries) to ensure the design works on mobile, tablet, and desktop.
5. **Accessible.** Use semantic HTML, proper heading hierarchy, alt text for any imagery (even placeholder), and sufficient color contrast.

---

## Design Elements Catalog

Each day, you MUST introduce at least **one new element** from this catalog that has not been used before in the current cycle. Track used elements in the Design History Log.

### Category A: Layout Patterns
| # | Element | Description |
|---|---------|-------------|
| A1 | Hero with offset grid | Asymmetric hero section with overlapping elements |
| A2 | Bento grid layout | Modular, app-like grid of rounded cards of varying sizes |
| A3 | Magazine-style columns | Multi-column editorial layout with pull quotes |
| A4 | Full-bleed split screen | Hero split vertically or horizontally into two contrasting halves |
| A5 | Masonry card grid | Pinterest-style staggered card layout |
| A6 | Z-pattern flow | Content organized along a Z-shaped scanning path |
| A7 | Sidebar-anchored layout | Persistent sidebar navigation with scrollable main content |
| A8 | Staggered alternating rows | Content rows that alternate left/right alignment |

### Category B: Hero Section Styles
| # | Element | Description |
|---|---------|-------------|
| B1 | Animated gradient background | CSS-only animated gradient or mesh gradient |
| B2 | Video-like parallax | CSS perspective + transform parallax effect |
| B3 | Floating 3D illustration | CSS 3D transforms creating a floating/tilting element |
| B4 | Typewriter text effect | CSS animation simulating typewriter text reveal |
| B5 | Glowing neon typography | Text with CSS glow/filter effects |
| B6 | Morphing blob background | Animated SVG or CSS blob shape behind hero text |
| B7 | Particle/dot grid background | CSS-only dot pattern with subtle animation |
| B8 | Glassmorphism hero card | Frosted glass effect card over a vibrant background |

### Category C: Navigation & Interactive Elements
| # | Element | Description |
|---|---------|-------------|
| C1 | Mega menu dropdown | Expansive dropdown with columns on hover |
| C2 | Hamburger to fullscreen overlay | Mobile menu that expands to fullscreen |
| C3 | Sticky shrink-on-scroll nav | Navbar that shrinks and changes style on scroll |
| C4 | Breadcrumb trail | Visible breadcrumb navigation |
| C5 | Tabbed content section | In-page tabs for switching content |
| C6 | Accordion FAQ section | Expandable/collapsible FAQ items |
| C7 | Floating action button | Persistent circular CTA button |
| C8 | Scroll progress indicator | Visual bar showing page scroll percentage |

### Category D: Card & Content Styles
| # | Element | Description |
|---|---------|-------------|
| D1 | Flip card (CSS 3D) | Card that flips on hover to reveal back content |
| D2 | Hover-expand card | Card that smoothly expands on hover with more detail |
| D3 | Testimonial carousel | CSS-only or minimal JS testimonial slider |
| D4 | Pricing table with highlight | Tiered pricing with one featured/popular tier |
| D5 | Timeline/roadmap | Vertical or horizontal timeline component |
| D6 | Stat counter cards | Animated number counters for key metrics |
| D7 | Avatar group / stack | Overlapping circular avatar component |
| D8 | Notification toast | Animated toast/notification popup |

### Category E: Typography & Embellishments
| # | Element | Description |
|---|---------|-------------|
| E1 | Variable font animation | Animating font weight/width/slant with variable fonts |
| E2 | Text gradient fill | Gradient applied to text via background-clip |
| E3 | Drop cap / initial letter | Styled first letter of paragraphs |
| E4 | Handwritten/accent font pairing | Script or display font for headings |
| E5 | Underline animation | Animated underline that draws on hover |
| E6 | Text outline/stroke effect | Transparent text with visible stroke |
| E7 | Rotating tagline | Cycling through multiple taglines via CSS animation |
| E8 | Decorative divider/ornament | Custom styled horizontal rules between sections |

### Category F: Backgrounds & Visual Effects
| # | Element | Description |
|---|---------|-------------|
| F1 | CSS-only gradient mesh | Complex multi-stop gradient creating depth |
| F2 | Geometric pattern (CSS) | Repeating geometric background via CSS |
| F3 | Noise/grain texture overlay | SVG filter adding subtle noise texture |
| F4 | Curved section dividers | Wavy or curved transitions between sections |
| F5 | Spotlight/highlight hover | Elements glow or spotlight on hover |
| F6 | Diagonal section cuts | Sections divided at an angle |
| F7 | Isometric grid background | CSS 3D isometric line grid |
| F8 | Aurora/northern lights effect | Animated flowing gradient bands |

### Category G: Footer Styles
| # | Element | Description |
|---|---------|-------------|
| G1 | Multi-column link farm | Organized 4-5 column footer with categorized links |
| G2 | Newsletter signup footer | Footer anchored by an email signup form |
| G3 | Minimal brand-footer | Ultra-minimal footer with just logo and social icons |
| G4 | Footer with embedded map | Placeholder map or location graphic in footer |
| G5 | Marquee/scrolling footer | Animated scrolling text or logo bar |
| G6 | Wave-shaped footer | Footer with a wavy top edge |

### Category H: Extra Flourishes
| # | Element | Description |
|---|---------|-------------|
| H1 | Dark/light mode toggle | CSS-only or minimal toggle for theme switching |
| H2 | Skeleton loading states | CSS animation for content loading placeholders |
| H3 | Custom cursor | CSS custom cursor styling |
| H4 | Scroll-triggered reveal | Elements animate into view on scroll (CSS only) |
| H5 | Parallax card stack | Cards that stack and separate on scroll |
| H6 | Marquee logo bar | Auto-scrolling row of logos |
| H7 | Grainy gradient buttons | Buttons with noise-textured gradients |
| H8 | Glowing border animation | Animated glowing border on cards or buttons |

---

## Industry & Company Randomizer

Select randomly from these pools. **Never repeat** an industry-company combination that has been used in the current cycle.

### Industries
1. Fintech / Digital Banking
2. Sustainable Fashion
3. Artisanal Coffee Roastery
4. Smart Home Automation
5. Electric Vehicle Charging
6. Plant-Based Food Tech
7. Mental Wellness App
8. Remote Work Collaboration
9. Pet Health & Nutrition
10. Space Tourism
11. Indoor Vertical Farming
12. Vintage Vinyl Marketplace
13. Eco-Friendly Cleaning Products
14. AI-Powered Tutoring
15. Handcrafted Furniture
16. Adventure Travel Booking
17. Craft Beer Subscription
18. Digital Art Marketplace
19. Yoga & Mindfulness Studio
20. Indie Board Game Publisher

### Company Name Generators
Combine one word from Column 1 with one from Column 2, or invent a fitting name:
- **Column 1:** Nova, Flux, Apex, Lumina, Terra, Velo, Cirrus, Ember, Drift, Pulse, Haven, Prism, Ridge, Bloom, Spark
- **Column 2:** Labs, & Co., Studio, Works, Collective, Supply, Forge, House, Path, Nest, Craft, Hub, Rise, Foundry, & Oak

Example combinations: Nova Labs, Ember & Co., Prism Studio, Drift Supply, Bloom Works.

---

## Design History Log

Maintain a design history log at `~/.claude/plugins/daily-webdesign/history.json`. This log tracks:
- All previously generated designs (date, industry, company name, color palette)
- All design elements from the catalog that have been used
- The count of designs generated

**Before generating a new design:**
1. Read the history log.
2. Identify which catalog elements have already been used.
3. Select at least ONE unused element from the catalog to feature.
4. Select an industry that hasn't appeared recently (avoid last 5).
5. Generate a company name that hasn't been used.

**After generating the design:**
1. Append the new design to the history log.
2. Mark all catalog elements used in this design.
3. Save the updated history.

### History JSON Schema