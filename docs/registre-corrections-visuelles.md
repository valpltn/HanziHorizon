# Registre des corrections visuelles

## Comparaison avec la maquette de référence

| Zone | Écart observé | Correction appliquée | Validation |
| --- | --- | --- | --- |
| Structure desktop | La carte centrale héritait de la hauteur du rail droit. | Grille à colonnes indépendantes avec `align-items: start`; carte d’apprentissage fixée autour de 540 px. | Capture desktop 1440×1000, sans étirement. |
| Carte du jour | Grande zone blanche sous les actions et hiérarchie dispersée. | Hanzi, pinyin et actions recentrés; pager placé dans son propre bandeau. | Contrôle visuel desktop et tablette. |
| Illustration | PNG vertical de 2,6 Mo et risque de déformation. | Conversion WebP à 60 Ko, dimensions explicites et `object-fit: cover`. | Image nette, proportion stable sur les trois formats. |
| Rail de statistiques | Hauteur couplée à la carte principale. | Cartes Objectif et Récents autonomes dans un rail aligné en haut. | Aucun chevauchement à 1440×1000 et 1024×768. |
| Mobile | Carte trop large, navigation compacte difficile à lire. | Menu latéral escamotable, carte mono-colonne, zones tactiles de 44 px minimum et tailles de hanzi adaptées. | 390×844 sans débordement horizontal. |
| Navigation iPhone | Le menu latéral prenait de la place et rendait les sections secondaires difficiles à découvrir. | Barre inférieure à cinq entrées, état actif explicite et panneau « Plus » accessible avec piège et restauration du focus. | iPhone 15 Pro 393×852, iPhone 320 px et paysage dans Playwright. |
| Premier écran mobile | Le jardin repoussait l’action suivante trop bas dans la page. | Résumé de progression compact et carte « Prêt à continuer ? » remontée avant l’arbre sur mobile. | Capture du premier viewport iPhone 15 Pro. |
| Contraste et focus | Traductions et contrôles secondaires trop discrets. | Couleurs jade/corail renforcées, focus visible et fonds de résultat explicites. | Parcours clavier et captures E2E. |
| Dialogues et formulaires | Fermeture, ordre de focus et erreurs n’étaient pas assez explicites pour les technologies d’assistance. | Rôles de dialogue, descriptions, piège de focus, retour au déclencheur, `aria-invalid`, alertes et confirmation d’abandon. | Parcours E2E tactile et audit axe des écrans clés. |
| Écriture | Le canvas perdait sa netteté et son contenu après redimensionnement. | Canvas redimensionné selon le DPR, contenu préservé et alternative clavier documentée. | iPhone portrait/paysage et contrôle du canvas nommé. |
| Installation | Aucune expérience d’installation iOS n’était définie. | Manifeste, icônes Apple/maskable, zones sûres, mode autonome et service worker de production. | Ressources HTTP et prise de contrôle du service worker. |
| Chargement mobile | Le catalogue complet alourdissait le JavaScript initial. | Chemin des leçons séparé et catalogue de 11 092 mots chargé à la demande. | Build : chunk initial de l’application ramené à environ 278 Ko ; catalogue différé. |
| Carte sociale | Visuel ancien non conforme au ratio de partage. | Nouvelle carte cohérente avec l’identité du site, recadrée en 1200×630. | Dimensions et texte français contrôlés. |

## Captures versionnées

- `captures/desktop-dashboard.png` et `captures/desktop-review.png`
- `captures/tablet-dashboard.png` et `captures/tablet-review.png`
- `captures/mobile-dashboard.png` et `captures/mobile-review.png`
- `../test-results/iphone-15-pro-first-viewport.png`, `iphone-15-pro-more-menu.png`, `iphone-15-pro-learning.png`, `iphone-15-pro-settings.png` et `iphone-15-pro-auth-error.png`

Les captures sont produites par Playwright après le chargement du mode découverte. Les tests vérifient aussi que la largeur du document ne dépasse jamais celle du viewport. Les captures `test-results` sont des preuves d’exécution locales et ne sont pas destinées à être versionnées.
