# Registre des corrections visuelles

## Comparaison avec la maquette de référence

| Zone | Écart observé | Correction appliquée | Validation |
| --- | --- | --- | --- |
| Structure desktop | La carte centrale héritait de la hauteur du rail droit. | Grille à colonnes indépendantes avec `align-items: start`; carte d’apprentissage fixée autour de 540 px. | Capture desktop 1440×1000, sans étirement. |
| Carte du jour | Grande zone blanche sous les actions et hiérarchie dispersée. | Hanzi, pinyin et actions recentrés; pager placé dans son propre bandeau. | Contrôle visuel desktop et tablette. |
| Illustration | PNG vertical de 2,6 Mo et risque de déformation. | Conversion WebP à 60 Ko, dimensions explicites et `object-fit: cover`. | Image nette, proportion stable sur les trois formats. |
| Rail de statistiques | Hauteur couplée à la carte principale. | Cartes Objectif et Récents autonomes dans un rail aligné en haut. | Aucun chevauchement à 1440×1000 et 1024×768. |
| Mobile | Carte trop large, navigation compacte difficile à lire. | Menu latéral escamotable, carte mono-colonne, zones tactiles de 44 px minimum et tailles de hanzi adaptées. | 390×844 sans débordement horizontal. |
| Contraste et focus | Traductions et contrôles secondaires trop discrets. | Couleurs jade/corail renforcées, focus visible et fonds de résultat explicites. | Parcours clavier et captures E2E. |
| Carte sociale | Visuel ancien non conforme au ratio de partage. | Nouvelle carte cohérente avec l’identité du site, recadrée en 1200×630. | Dimensions et texte français contrôlés. |

## Captures versionnées

- `captures/desktop-dashboard.png` et `captures/desktop-review.png`
- `captures/tablet-dashboard.png` et `captures/tablet-review.png`
- `captures/mobile-dashboard.png` et `captures/mobile-review.png`

Les captures sont produites par Playwright après le chargement du mode découverte. Les tests vérifient aussi que la largeur du document ne dépasse jamais celle du viewport.
