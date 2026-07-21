# Plan de test — plateforme d’apprentissage du chinois

## 1. Périmètre fonctionnel à tester

### Accès, compte et synchronisation

- Mode découverte sans compte, avec progression locale temporaire.
- Création d’un compte par e-mail et mot de passe.
- Confirmation de l’adresse e-mail, connexion, maintien de session et déconnexion.
- Mot de passe oublié et définition d’un nouveau mot de passe.
- Ouverture du profil, affichage de l’identité et fermeture du panneau.
- Import automatique et unique de la progression découverte lors de la première connexion.
- Chargement depuis le cloud des paramètres, favoris, révisions, quiz et statistiques propres au compte.
- Isolation stricte des données entre deux comptes.

### Tableau de bord

- Mot du jour, caractères, pinyin, traduction, exemple et niveau.
- Prononciation chinoise, message explicite si la synthèse vocale est indisponible.
- Révélation/masquage de la réponse, navigation précédent/suivant et mots récents.
- Objectif quotidien calculé à partir de l’activité réellement enregistrée.
- Quiz rapide avec résultat juste/faux et enregistrement de la réponse.

### Révisions intelligentes

- File des mots dus et démarrage d’une vraie session.
- Réponses « À revoir », « Difficile », « Bien » et « Facile ».
- Calcul des intervalles, prochaine échéance, passage au mot suivant et fin de session.
- Reprise d’une session interrompue sans double comptage.

### Leçons et bibliothèque

- Parcours HSK 1 à 3, ouverture d’une leçon et progression réelle.
- Niveaux 4 à 9 visibles, verrouillés et expliqués.
- Recherche hanzi/pinyin/français, filtres par niveau, thème et statut.
- État vide, mise en favori, retrait des favoris et lecture audio.
- Provenance et version du catalogue visibles sans texte corrompu.

### Quiz et examen

- QCM chinois→français et français→chinois.
- Saisie du pinyin, avec tons diacritiques ou chiffres tolérés.
- Association, phrase à trous, dictée audio et reconnaissance de caractère.
- Sélection du type, réponse, correction, question suivante et résumé final.
- Examen chronométré de 20 questions, choix du niveau, abandon confirmé, résultat et reprise ciblée des erreurs.

### Écriture

- Affichage du modèle, écoute, dessin à la souris et au toucher.
- Effacer, recommencer, validation locale basique et caractère suivant.
- Canvas correctement dimensionné après changement de viewport.

### Statistiques et paramètres

- Compte neuf à zéro : mots maîtrisés, précision, temps, série et activité.
- Mise à jour après chaque révision/quiz/session sans métrique simulée.
- Mots à revoir, précision par type, temps d’étude, série quotidienne, progression par niveau, activité hebdomadaire et erreurs fréquentes.
- Modification et persistance de l’objectif quotidien, du niveau actif et de l’affichage des tons.

### Interface, accessibilité et robustesse

- Navigation complète au clavier, focus visible, libellés accessibles et zones tactiles suffisantes.
- Affichage 1440×1000, 1024×768 et 390×844 sans chevauchement ni débordement.
- Carte centrale proportionnée comme la référence, rail droit indépendant et images non déformées.
- Chargement, erreur réseau, hors-ligne léger, absence de voix et données vides.
- Audit de tous les boutons, liens, champs, curseurs, cases à cocher et zones de dessin : aucune commande active ne doit être inerte.

## 2. Objectifs de validation

| Domaine | Critère d’acceptation |
| --- | --- |
| Compte neuf | Toutes les statistiques démarrent à zéro et aucun historique d’un autre utilisateur n’est visible. |
| Persistance cloud | Une action effectuée dans un navigateur réapparaît après déconnexion/reconnexion et dans un second navigateur connecté au même compte. |
| Isolation | Deux comptes ne peuvent ni lire ni modifier les lignes de l’autre, y compris par requête directe à l’API. |
| Import découverte | L’import ne s’exécute qu’une fois, fusionne sans perdre les données cloud et ne crée aucun doublon. |
| Répétition espacée | Les quatre réponses produisent des échéances cohérentes et testées aux bornes. |
| Quiz/examen | Chaque type accepte les variantes prévues, refuse les réponses fausses, enregistre le résultat et alimente les statistiques. |
| Commandes | Chaque contrôle déclenche un changement visible, une navigation, une sauvegarde ou un message d’erreur explicite. |
| Données | UTF-8 valide, identifiants uniques, niveaux 1–9 valides, pinyin exploitable et provenance conservée. |
| Résilience | Une panne réseau n’efface pas le travail local ; une synchronisation ultérieure est proposée ou automatique. |
| Visuel | Les trois viewports cibles respectent la maquette : carte centrale non étirée, image cadrée, texte lisible et rail non déformé. |
| Accessibilité | Parcours principal réalisable au clavier, focus perceptible, canvas et boutons nommés, contraste utile. |
| Livraison | Build, tests unitaires, tests d’intégration, tests E2E, audit RLS et vérification visuelle réussissent avant publication privée. |

## 3. Stratégie et jeux de données

- Tests unitaires : normalisation du pinyin, planification SRS, agrégation statistique et fusion découverte/cloud.
- Tests d’intégration : opérations Supabase sous RLS, sauvegarde/chargement, reprise et dédoublonnage.
- Tests E2E : découverte, création/connexion, navigation complète, révision, quiz, examen, écriture, paramètres et statistiques.
- Tests visuels : comparaison à la référence fournie aux trois dimensions cibles.
- Données : compte vierge, compte actif, deuxième compte isolé, session hors-ligne et réponses aux quatre niveaux de difficulté.

## 4. Ordre d’exécution

1. Vérifier encodage, build et tests unitaires.
2. Vérifier schéma, politiques RLS et isolation avec deux identités.
3. Exécuter les parcours fonctionnels et la persistance multi-session.
4. Auditer tous les contrôles et les états d’erreur.
5. Contrôler desktop, tablette et mobile face à la référence.
6. Refaire un smoke test sur la version privée publiée.
