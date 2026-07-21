# Apprendre le chinois

Application d’apprentissage du chinois avec mode découverte local et comptes Supabase.

## Développement

Prérequis : Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Commandes de validation :

```bash
npm run build
npm test
npm run lint
npm run test:e2e
```

## Stockage

- Le vocabulaire est livré comme ressource statique dans `app/data/` et `data/`.
- Les progrès invités sont temporaires et versionnés dans le navigateur.
- Supabase est l’unique stockage distant des comptes, paramètres, progrès et statistiques.
- `.openai/hosting.json` conserve uniquement l’identifiant du projet Sites ; aucun binding D1 n’est actif.

Le schéma Supabase et les politiques RLS sont versionnés dans `supabase/migrations/`.
