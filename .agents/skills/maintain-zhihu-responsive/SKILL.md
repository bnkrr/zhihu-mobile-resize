---
name: maintain-zhihu-responsive
description: Diagnose, fix, and regression-test narrow-screen behavior in the Zhihu userscripts repository. Use when a Zhihu desktop page, header, content column, card, tab row, comment/reply UI, editor, popover, or portal overlay overflows, clips, overlaps, scrolls incorrectly, hides a critical control, or otherwise fails at mobile viewport widths; also use when adding responsive page coverage or reorganizing zhihu-mobile-resize.user.js.
---

# Maintain Zhihu Responsive

Maintain a responsive layer for Zhihu's desktop DOM while preserving the desktop user agent and desktop product. Treat each report as a constraint failure, then turn confirmed states into repeatable regression coverage.

## Establish the contract

Read `AGENTS.md`, `tests/README.md`, and the relevant userscript sections before acting. Respect the requested scope: diagnose without editing when the user only asks for analysis; implement and verify when asked to change the script.

Represent a defect as:

```text
surface × interaction state × failure mechanism × viewport × broken invariant
```

Classify the failure mechanism as one or more of:

- fixed or minimum size constraint;
- desktop multi-column composition;
- absolute, fixed, sticky, transformed, or reserved positioning;
- wrong scroll owner or inaccessible overflow;
- portal, modal, editor, or critical-exit failure;
- intrinsic wide content such as media, tables, code, or long text;
- device-specific viewport, scrollbar, touch, or safe-area behavior.

## Reproduce with evidence

1. Use only the first logged-in Zhihu Chrome page target through CDP.
2. Load the page at desktop width before injecting so Zhihu produces desktop DOM.
3. Preserve Windows desktop UA, `mobile: false`, device scale factor `1`, and touch disabled unless the interaction itself requires temporary touch emulation.
4. Inject the complete current userscript, then test `403 × 730` and `390 × 844`.
5. Record `innerWidth`, `clientWidth`, `scrollWidth`, relevant element rectangles, computed positioning/overflow, and hit testing for critical controls.
6. Inspect screenshots at the top, true bottom, and each failing interaction state. Do not equate clipped overflow with a fix.
7. Do not inspect or persist cookies, tokens, private URLs, page text, or account identifiers.

## Choose the repair layer

Put each rule in the narrowest matching module in `zhihu-mobile-resize.user.js`:

- `foundation`: viewport-wide sizing and overflow contract only;
- `shell`: shared header, search, and navigation shell;
- `discovery-pages`: home, hot list, search, and topic templates;
- `question-and-profile`: question, answer, and author/profile templates;
- `column-article`: `zhuanlan.zhihu.com` article layout;
- `shared-content`: reusable rich content, media, cards, and action rows;
- `overlays-and-editors`: comments, replies, annotation portals, and editors.

Keep the final userscript directly installable. Add a build step only when the user explicitly accepts that maintenance tradeoff.

## Apply a bounded repair

- Anchor on stable semantic classes or accessible attributes.
- Follow fixed-width ancestor chains upward from a stable content root.
- Limit `:has(...)` to known shallow ancestor relationships.
- Prefer single-column flow on narrow screens; hide only proven auxiliary sidebars.
- Give tabs and inherently wide content a local horizontal scroller.
- Give overlays one vertical scroll owner and keep exit controls inside the viewport.
- Return fixed answer/article actions to normal flow when they cover content.
- Never restore global `* { max-width: 100vw; min-width: 0; }` or global flex wrapping.
- Avoid committed hashed `css-*` selectors unless no stable structure exists and the fragility is documented.
- Keep every responsive rule under `max-width: 768px` and preserve browser zoom.

## Promote the state into regression coverage

For a newly confirmed state:

1. Add a non-personal fixture URL or local override to `tests/cases.json`.
2. Add a state driver to `tests/cdp_regression.py` using semantic or accessible anchors.
3. Audit invariants instead of page text: viewport bounds, document overflow, hit target, scroll owner, editor reachability, and required semantic roots.
4. Keep screenshots and reports in `.local/test-results/`.
5. Do not make a dynamic state test depend solely on a hashed class.

## Verify before completion

Run the smallest relevant case first, then the affected page matrix. Verify:

- semantic roots remain present;
- the document has no unintended horizontal overflow;
- important rectangles stay inside the visual viewport;
- close/back controls are visible and hit-testable;
- the true bottom remains reachable and fixed UI does not cover it;
- allowed horizontal scrollers still scroll locally;
- the same rules are inactive above `768px`;
- the metadata blocks and versions of `.user.js` and `.meta.js` match;
- `git diff --check` passes and unrelated changes remain untouched.

When live content prevents deterministic automation, report the exact missing state and retain the generic invariant check. Continue exploratory testing because Zhihu can introduce new DOM implementations that the model cannot predict.
