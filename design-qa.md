# Design QA — XP Garden Home

Reference: revised selected concept `exec-e7d5a4ad-6b54-41e8-ae09-28c1cfc66ef2.png`.

Implementation captures:

- `test-results/desktop-dashboard.png` at 1440 × 1000
- `test-results/tablet-dashboard.png` at 1024 × 768
- `test-results/mobile-dashboard.png` at 390 × 844

## Comparison

- The existing Hanzi Horizon sidebar, ivory canvas, forest-green palette, serif hierarchy and coral primary action are preserved.
- The tree is the dominant home-page object and uses a project-local raster illustration rather than CSS or placeholder art.
- XP is separated from visible growth: ordinary lessons fill the progress bar, while the displayed tree stage changes only at milestone thresholds.
- The milestone hierarchy matches the selected concept: floraison at 1,500 XP, new branch at 3,000 XP and HSK fruit at 6,000 XP.
- The next-lesson action is visible and functional at desktop, tablet and mobile sizes.
- Desktop and mobile captures have no horizontal overflow or clipped primary actions.

## Remaining polish

- P3: the production tree has fewer learning nodes than the reference to keep the home screen focused.
- P3: the mobile layout stacks the lesson card below the tree instead of floating it beside the crown.

final result: passed
