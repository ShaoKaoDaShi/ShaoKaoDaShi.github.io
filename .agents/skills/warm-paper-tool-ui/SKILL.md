---
name: warm-paper-tool-ui
description: Design, implement, refactor, or review web pages and websites in the compact warm-paper internal-tool style used by AllInOne. Use for frontend page work, responsive layouts, UI components, visual consistency, or requests to follow the current project theme.
tags: [frontend, ui, design-system, react, css]
version: "1.0.0"
---

# Warm Paper Tool UI

Create reliable, compact, data-first web interfaces with the visual language established by AllInOne. The result should feel like a precise internal editing tool, not a marketing page, generic dashboard, or chat product.

## When To Use

Use this skill when the task includes:

- Creating a new page or website
- Implementing or refactoring frontend components
- Applying the current AllInOne visual style
- Improving layout density or responsive behavior
- Reviewing UI consistency, accessibility, or design quality

Do not use it for backend-only work or visual tasks with a different explicit design system.

## Mandatory Context Check

Before changing UI code:

1. Search for all relevant `AGENTS.md` files.
2. Read the global theme, shared layout styles, and the closest existing page.
3. Search for reusable components, classes, and tokens before adding new ones.
4. Confirm the framework, routing, styling approach, and existing breakpoints.
5. Preserve an established design system when one exists; do not overlay a second one.

For the AllInOne repository, the source of truth is:

- Design rules: `AGENTS.md`
- Theme tokens: `src/index.css`
- Shared page primitives: `src/App.css`
- Reference page: `src/pages/CsvConverterPage.tsx`
- Reference business styles: `src/pages/CsvConverterPage.css`

If documentation and code differ, inspect recent changes and treat the current implementation as authoritative until the discrepancy is resolved.

## Design Direction

Use these qualities consistently:

- Warm paper background
- Dense but readable information layout
- Clear structural borders
- Restrained industrial character
- Data and actions before decoration
- Direct, non-marketing copy
- Near-square controls and panels
- Subtle offset shadows rather than blurred elevation

The interface should communicate reliability, precision, and local control.

## Core Principles

### Compact First

- Put the primary operation in the first viewport when practical.
- Remove duplicate explanations and decorative empty space.
- Keep headers, panel bars, statistics, forms, and tables compact.
- Use one concise lead sentence instead of multiple descriptive blocks.
- Allow mobile wrapping without creating oversized vertical gaps.

### Structure First

- Organize pages as Header, Workspace, and Panel layers.
- Use thin borders, surface contrast, and small offset shadows for hierarchy.
- Keep one business region per panel.
- Avoid nested cards and unnecessary containers.
- Make filenames, IDs, statuses, values, and primary actions easy to scan.

### Restrained Color

- Use warm gray, paper white, green-black ink, and brick red.
- Reserve brick red for primary actions, section indices, focus, and limited emphasis.
- Use existing danger tokens for errors.
- Do not introduce a new page-specific color system.

### Functional Clarity

- Give actions specific labels such as “下载 CSV” or “浏览文件”.
- Show state, errors, statistics, and output directly.
- Use icons only as support; icon-only controls require `aria-label`.
- State local-only processing explicitly when relevant.

## Existing Project Mode

When the project already has theme tokens and shared classes:

1. Reuse them before writing page-specific CSS.
2. Add page CSS only for business-specific layout or data presentation.
3. Add a global token only when no existing semantic token expresses the need.
4. Add a shared primitive only when it is useful across at least two contexts or clearly belongs to the global page skeleton.
5. Avoid hardcoded colors in business CSS.

In AllInOne, use the `--theme-*` tokens and `app-*` classes directly.

## New Website Mode

When no design system exists, establish a small semantic foundation before page styling:

```css
:root {
  --theme-canvas: #e8e4da;
  --theme-paper: #f2efe6;
  --theme-surface: #fffdf8;
  --theme-surface-muted: #faf8f1;
  --theme-ink: #17201e;
  --theme-text: #4e5854;
  --theme-muted: #66706c;
  --theme-line: #cfcac0;
  --theme-line-strong: #a9a398;
  --theme-accent: #c84b2f;
  --theme-accent-strong: #9f3520;
  --theme-accent-soft: #fff2ea;
  --theme-focus: rgba(200, 75, 47, 0.3);
  --theme-panel-shadow: 3px 3px 0 rgba(23, 32, 30, 0.08);
  --theme-control-radius: 2px;
  --theme-page-width: 1440px;
  --theme-font-sans: system-ui, 'Segoe UI', Roboto, sans-serif;
  --theme-font-mono: ui-monospace, Consolas, monospace;
}
```

Adapt token names to an existing framework or design system instead of duplicating equivalent variables.

## Shared AllInOne Primitives

Prefer these classes when working in AllInOne:

| Class | Purpose |
| --- | --- |
| `.app-page` | Full page root |
| `.app-page-header` | Paper-grid page header |
| `.app-page-header-split` | Header title and context columns |
| `.app-page-eyebrow` | Short category label |
| `.app-page-title` | The page’s single `h1` |
| `.app-page-lead` | Concise feature explanation |
| `.app-workspace` | Main content region |
| `.app-panel` | Standard business panel |
| `.app-panel-header` | Compact panel title bar |
| `.app-panel-heading` | Section index and title group |
| `.app-section-index` | `01`, `02`, and similar indices |
| `.app-panel-title` | Panel `h2` |
| `.app-subheading` | Inner `h3` |
| `.app-button` | Required button base |
| `.app-button-primary` | Primary brick-red action |
| `.app-button-secondary` | Ink-border secondary action |
| `.app-button-text` | Low-emphasis action |
| `.visually-hidden` | Accessible hidden content |

## Page Skeleton

Start from this structure in AllInOne:

```tsx
const ExamplePage = () => (
  <div className="app-page example-page">
    <header className="app-page-header app-page-header-split">
      <div>
        <p className="app-page-eyebrow">功能分类</p>
        <h1 className="app-page-title">页面标题</h1>
        <p className="app-page-lead">一句话说明用户可以完成什么。</p>
      </div>
      <div>{/* Only necessary context or state */}</div>
    </header>

    <main className="app-workspace">
      <section className="app-panel" aria-labelledby="example-title">
        <div className="app-panel-header">
          <div className="app-panel-heading">
            <span className="app-section-index">01</span>
            <h2 className="app-panel-title" id="example-title">
              主要操作
            </h2>
          </div>
          <button className="app-button app-button-primary" type="button">
            执行操作
          </button>
        </div>
        {/* Business-specific content */}
      </section>
    </main>
  </div>
)
```

Vary the business layout when needed, but preserve theme, density, hierarchy, and interaction feedback.

## Layout Rules

### Desktop

- Use the global page width; AllInOne currently uses `1440px`.
- Use compact page-header padding around `30px 40px 26px`.
- Use workspace padding around `20px 40px 28px` with `16px` gaps.
- Keep panel title bars near `52px` high.
- Keep split-header context columns near `360px` and only include useful information.
- Use one thin border and a small right-bottom offset shadow per panel.

### Mobile

Use the project breakpoint; AllInOne uses `760px`.

- Collapse split headers to one column.
- Reduce header padding to about `22px 16px 18px`.
- Reduce workspace padding to about `12px 10px 20px`.
- Reduce panel title bars to about `48px`.
- Keep wide tables inside a local horizontal scroll container.
- Never allow page-level horizontal overflow at `375px`.
- Make the primary operation easy to reach; use full-width controls only when needed.

## Typography

- Use exactly one `h1` per page.
- Use `h2` for panel titles and `h3` for inner sections.
- Keep headings bold, compact, and sans-serif.
- Use the monospace font for data, IDs, filenames, code, and section indices.
- Use `font-variant-numeric: tabular-nums` for comparable numeric values.
- Use `text-wrap: balance` for headings and `text-wrap: pretty` for prose.
- Truncate or wrap long user content without breaking layout.

## Controls

- Every button uses the shared base class or equivalent design-system primitive.
- Usually allow one primary brick-red action per region.
- Use transparent ink-border secondary buttons.
- Use text buttons for clear, cancel, or other weak actions.
- Keep controls near-square with small radii, not pills.
- Provide visible hover, active, disabled, and `:focus-visible` states.
- Use semantic `button`, `a`, `input`, and `label` elements.

## Forms And Status

- Every form control has a visible label or `aria-label`.
- Place errors next to the relevant control or operation.
- Put asynchronous status and errors in `aria-live="polite"` regions.
- Use the ellipsis character `…` in loading text.
- Show empty, loading, success, and failure states explicitly.
- Do not hide critical meaning behind color or icons alone.

## Tables And Data

- Prefer semantic tables for tabular data; do not replace them with card grids.
- Use a warm-gray header, thin row separators, and subtle striping.
- Keep row height compact.
- Show missing values as `—`.
- Limit previews instead of rendering large datasets at once.
- Keep wide tables inside a local `.table-scroll`-style container.
- Prioritize scanning over decoration.

## Accessibility And Interaction

- Use semantic landmarks such as `header`, `main`, `section`, and `table`.
- Decorative icons use `aria-hidden="true"`.
- Icon-only controls use `aria-label`.
- All controls must work by keyboard and show focus.
- Never disable browser zoom or remove focus without replacement.
- Animate only necessary properties.
- Honor `prefers-reduced-motion`.
- Verify long content and narrow viewports.

## Forbidden Visual Patterns

Unless the user explicitly requests a different direction, do not add:

- Purple or blue-purple gradients
- Neon colors or large saturated backgrounds
- Glassmorphism, backdrop blur, or glowing borders
- Oversized rounded corners or pill-heavy layouts
- Gradient text or large decorative headlines
- Large blurred shadows or floating card walls
- Cards nested inside cards
- Decorative status dots, badges, or invented statistics
- Emoji as functional icons
- Marketing slogans or oversized hero sections
- Large low-information whitespace
- Page-private theme variable sets that duplicate global tokens
- Automatic system dark-mode overrides

The thin grid in the page header is a structural brand element. Do not replace it with a colorful gradient.

## Implementation Workflow

1. Inspect `AGENTS.md`, global styles, shared primitives, and reference pages.
2. Identify the user’s primary task and the minimum UI needed to complete it.
3. Reuse existing components, classes, and tokens.
4. Build semantic structure before page-specific decoration.
5. Add the smallest amount of business CSS required.
6. Check empty, loading, success, error, and long-content states.
7. Review desktop and `375px` mobile layouts.
8. Run the repository’s test, lint, typecheck, and build commands.
9. Report any verification that could not be performed.

For AllInOne, run:

```bash
pnpm test
pnpm lint
pnpm build
```

## Review Mode

When asked to review a page, report findings first in severity order. Check:

- Theme token violations
- Missing shared primitive reuse
- Excess whitespace or weak information hierarchy
- Page-level horizontal overflow
- Long-content breakage
- Missing focus, labels, or status announcements
- Inconsistent buttons, borders, radii, or shadows
- Forbidden visual patterns
- Missing loading, empty, error, or success states

Include file and line references for each finding.

## Completion Checklist

Before claiming completion, verify:

- Global semantic tokens are used consistently.
- The page root and main structure reuse shared primitives when available.
- Page-specific CSS contains only business-specific layout and presentation.
- There is no duplicate theme or hardcoded equivalent color system.
- The first viewport has no large meaningless gaps.
- The design has no excessive rounding, gradients, glass effects, or nested cards.
- Long text, filenames, identifiers, and empty values are safe.
- Keyboard focus and status announcements work.
- Desktop and mobile have no page-level horizontal overflow.
- Tests, lint, typecheck, and build pass when available.

## Reference Standard

In AllInOne, `src/pages/CsvConverterPage.tsx` is the current reference implementation. Match its warm paper background, ink headings, fine borders, brick-red emphasis, near-square controls, subtle offset shadow, compact density, and direct Chinese copy without mechanically copying its business layout.
