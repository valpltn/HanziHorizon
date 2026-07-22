# Design QA

## XP Garden Home

Reference: revised selected concept `exec-e7d5a4ad-6b54-41e8-ae09-28c1cfc66ef2.png`.

Implementation captures:

- `test-results/desktop-dashboard.png` at 1440 × 1000
- `test-results/tablet-dashboard.png` at 1024 × 768
- `test-results/mobile-dashboard.png` at 390 × 844

### Comparison

- The existing Hanzi Horizon sidebar, ivory canvas, forest-green palette, serif hierarchy and coral primary action are preserved.
- The tree is the dominant home-page object and uses a project-local raster illustration rather than CSS or placeholder art.
- XP is separated from visible growth: ordinary lessons fill the progress bar, while the displayed tree stage changes only at milestone thresholds.
- The milestone hierarchy matches the selected concept: floraison at 1,500 XP, new branch at 3,000 XP and HSK fruit at 6,000 XP.
- The next-lesson action is visible and functional at desktop, tablet and mobile sizes.
- Desktop and mobile captures have no horizontal overflow or clipped primary actions.

### Remaining polish

- P3: the production tree has fewer learning nodes than the reference to keep the home screen focused.
- P3: the mobile layout stacks the lesson card below the tree instead of floating it beside the crown.

Final result: passed.

## Leçons mobiles

## Cible et méthode

- Référence : `C:/Users/vapla/.codex/generated_images/019f8621-9a95-7db2-83bd-858d46577482/exec-805bf781-6538-4cbd-a72f-5a0210999463.png`
- Rendu vérifié : `test-results/iphone-15-pro-lesson-normal.png`
- Comparaison côte à côte : `test-results/design-qa-comparison.png`
- Viewport canonique : iPhone 15 Pro, 393 × 659 px, puis contrôle PWA à 393 × 852 px.

## Corrections issues de la comparaison

- P0 : aucun.
- P1 : la première composition plaçait la question et les réponses trop bas. La grille verticale a été recalée pour retrouver la hiérarchie de la référence et conserver les quatre réponses dans le premier viewport.
- P1 : le bambou initial était trop petit et ne montrait pas ses tiges. Son cadrage a été rapproché de la référence avec l’asset noir existant.
- P2 : le bouton de fermeture avait un cercle absent de la maquette. Le fond et la bordure ont été supprimés sur mobile tout en conservant une cible de 44 × 44 px.
- P2 : la dictée exposait deux commandes d’écoute concurrentes. L’écoute contextuelle reste dans la barre inférieure et le pinyin est associé aux choix en hanzi.
- P2 : les réponses ont reçu un fond opaque pour empêcher le décor d’encre de réduire leur lisibilité.

## Contrôles finaux

- Aucun débordement vertical à 393 × 659 ou 393 × 852 px.
- Progression, XP, consigne, contenu, pinyin, réponses et commandes pertinentes visibles ensemble.
- Cibles tactiles principales de 44 px minimum et focus clavier visible.
- Aucun problème Axe sérieux ou critique sur la matrice mobile canonique.
- Les vues desktop conservent leur carte et leur consigne détaillée ; les règles plein écran sont limitées à `max-width: 820px`.

Final result: passed.
