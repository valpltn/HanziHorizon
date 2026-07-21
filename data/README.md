# Catalogue HSK 3.0

`hsk30-source.csv` contient les 11 092 entrées du référentiel HSK 3.0 (hanzi simplifié et traditionnel, pinyin, catégorie, niveau et références CEDICT). Source : [ivankra/hsk30](https://github.com/ivankra/hsk30), données dérivées du standard chinois 2021 et dépôt sous licence MIT.

Les 11 092 entrées sont intégrées à la bibliothèque. Les niveaux 7, 8 et 9 sont regroupés sous « Niveaux 7–9 », conformément au fichier source qui ne les sépare pas.

Les définitions françaises proviennent de [CFDICT](https://chine.in/mandarin/open/CFDICT/), distribué sous licence Creative Commons avec attribution et partage à l’identique. Le rapprochement couvre 10 721 entrées ; les 371 restantes sont conservées avec la mention « Traduction française indisponible ».

Pour régénérer `app/data/hsk-vocabulary.json`, télécharger `cfdict.u8`, puis lancer :

```bash
python scripts/build-vocabulary.py /chemin/vers/cfdict.u8
```

Le vocabulaire reste une ressource statique hors ligne : Supabase stocke uniquement les comptes, paramètres, progrès et statistiques, sans stockage D1 concurrent.
