#!/usr/bin/env python3
"""Build a deterministic, thematic HSK lesson path from the vocabulary catalog."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOCABULARY = ROOT / "app" / "data" / "hsk-vocabulary.json"
CATALOG = ROOT / "app" / "data" / "catalog.ts"
OUTPUT = ROOT / "app" / "data" / "lesson-path.json"

CURRICULUM = {
    1: [
        ("Premiers échanges", "Saluer, se présenter et rester poli.", ["bonjour", "saluer", "merci", "nom", "appeler", "être", "personne", "ami", "monsieur", "madame", "tu", "vous", "je", "nous", "oui", "non", "présenter", "parler", "bienvenue", "revoir"]),
        ("Famille et maison", "Parler de ses proches et de son quotidien.", ["famille", "père", "mère", "frère", "soeur", "maison", "chambre", "table", "porte", "habiter"]),
        ("Temps et nombres", "Compter et situer une action dans le temps.", ["nombre", "heure", "jour", "semaine", "mois", "année", "matin", "soir", "aujourd", "demain"]),
        ("Manger et se déplacer", "Commander, acheter et trouver son chemin.", ["manger", "boire", "riz", "thé", "restaurant", "acheter", "argent", "route", "voiture", "gare"]),
    ],
    2: [
        ("Conversations utiles", "Poser des questions et exprimer ses préférences.", ["question", "demander", "répondre", "penser", "aimer", "préférer", "comprendre", "parler", "dire", "inviter"]),
        ("Ville et services", "Utiliser les transports et les services du quotidien.", ["ville", "bus", "métro", "taxi", "hôtel", "banque", "magasin", "hôpital", "poste", "billet"]),
        ("Corps et santé", "Décrire son corps, son état et ses activités.", ["corps", "tête", "main", "maladie", "médecin", "santé", "sport", "courir", "fatigu", "douleur"]),
        ("Études et travail", "Parler de l’école, du travail et de ses capacités.", ["école", "étudier", "examen", "professeur", "travail", "bureau", "réunion", "savoir", "pouvoir", "apprendre"]),
    ],
    3: [
        ("Raconter et prévoir", "Relier le passé, le présent et les projets.", ["expérience", "passé", "préparer", "projet", "avenir", "commencer", "finir", "arriver", "événement", "souvenir"]),
        ("Relations et émotions", "Nuancer ses sentiments et ses relations.", ["sentiment", "heureux", "triste", "peur", "colère", "amitié", "relation", "confiance", "aider", "ensemble"]),
        ("Voyages et découvertes", "Voyager, décrire un lieu et partager une découverte.", ["voyage", "pays", "étranger", "avion", "paysage", "visiter", "culture", "photo", "climat", "environnement"]),
        ("Expliquer et comparer", "Construire des phrases plus longues et précises.", ["parce", "cause", "raison", "donc", "comparer", "différence", "semblable", "cependant", "condition", "résultat"]),
    ],
    4: [
        ("Vie professionnelle", "Communiquer avec précision au travail.", ["carrière", "entreprise", "collègue", "responsable", "réunion", "contrat", "projet", "client", "emploi", "salaire", "profession", "équipe", "direction", "tâche", "plan"]),
        ("Société et règles", "Comprendre les institutions et la vie collective.", ["société", "gouvernement", "loi", "règle", "droit", "public", "service", "organisation", "sécurité", "responsabilité"]),
        ("Médias et numérique", "S’informer et parler des technologies.", ["média", "journal", "information", "internet", "réseau", "téléphone", "ordinateur", "programme", "message", "vidéo", "presse", "publication", "communiquer", "logiciel", "télévision"]),
        ("Argumenter", "Exprimer une opinion, une cause et une conséquence.", ["opinion", "argument", "preuve", "raison", "conséquence", "supposer", "expliquer", "convaincre", "accord", "désaccord", "discussion", "idée", "cause", "conclusion", "justifier", "point de vue", "défendre"]),
    ],
    5: [
        ("Actualité et monde", "Suivre les événements nationaux et internationaux.", ["actualité", "international", "politique", "économie", "pays", "guerre", "paix", "population", "crise", "développement", "gouvernement", "société", "événement", "monde", "nation", "peuple", "étranger", "réforme", "région", "conflit", "public", "pouvoir", "social"]),
        ("Sciences et environnement", "Décrire une recherche, une innovation et leurs effets.", ["science", "recherche", "technologie", "expérience", "énergie", "environnement", "nature", "pollution", "climat", "ressource", "scientifique", "écologie", "matière", "phénomène", "technique", "découverte", "protéger", "déchet"]),
        ("Histoire et culture", "Explorer les traditions, les arts et la mémoire.", ["histoire", "tradition", "culture", "art", "littérature", "musique", "peinture", "ancien", "époque", "cérémonie", "mémoire", "patrimoine", "coutume", "religion", "musée", "spectacle", "oeuvre"]),
        ("Expression nuancée", "Synthétiser, interpréter et nuancer une idée.", ["abstrait", "concept", "signifier", "interpréter", "résumer", "nuance", "expression", "point de vue", "contexte", "essentiel", "sens", "idée", "avis", "comprendre", "expliquer", "précis", "général", "particulier"]),
    ],
    6: [
        ("Analyser des données", "Présenter des causes, des tendances et des résultats.", ["analyse", "donnée", "statistique", "tendance", "taux", "augmentation", "diminution", "résultat", "facteur", "méthode", "mesure", "calcul", "rapport", "proportion", "évaluer", "enquête", "indice"]),
        ("Stratégie et négociation", "Décider, négocier et gérer un projet complexe.", ["stratégie", "négocier", "gestion", "décision", "objectif", "risque", "accord", "coopération", "investissement", "marché", "plan", "direction", "diriger", "organiser", "compromis", "partenaire", "concurrence"]),
        ("Débats et démonstration", "Défendre une position avec précision.", ["débat", "thèse", "argument", "preuve", "contredire", "justifier", "conclusion", "hypothèse", "critique", "jugement", "opinion", "raisonnement", "démontrer", "défendre", "discussion", "opposition", "convaincre", "réfuter", "soutenir", "logique"]),
        ("Pensée et création", "Parler de philosophie, de littérature et d’esthétique.", ["philosophie", "pensée", "littérature", "oeuvre", "auteur", "création", "esthétique", "symbole", "imagination", "esprit", "art", "culture", "écrivain", "poésie", "roman", "idée", "conscience"]),
    ],
    7: [
        ("Diplomatie et droit", "Comprendre les relations internationales et juridiques.", ["diplomatie", "juridique", "loi", "tribunal", "accord", "traité", "souverain", "conflit", "institution", "autorité"]),
        ("Économie avancée", "Analyser les marchés, les politiques et les échanges.", ["économie", "finance", "capital", "marché", "commerce", "monnaie", "budget", "industrie", "croissance", "inflation"]),
        ("Sciences et innovation", "Décrire des systèmes, des découvertes et des technologies.", ["scientifique", "innovation", "recherche", "théorie", "système", "technologie", "biologie", "physique", "mécanisme", "laboratoire"]),
        ("Rhétorique et pensée", "Maîtriser les idées abstraites et la communication experte.", ["rhétorique", "raisonnement", "concept", "idéologie", "paradoxe", "métaphore", "interprétation", "synthèse", "doctrine", "perspective"]),
    ],
}

PHASES = [
    ("discover", "Découvrir", "Reconnaître le vocabulaire essentiel.", 6, 10),
    ("practice", "En situation", "Comprendre et rappeler les mots dans leur contexte.", 8, 15),
    ("checkpoint", "Défi", "Valider la thématique avant de poursuivre.", 10, 20),
]


def normalize(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFD", value.lower())
        if unicodedata.category(character) != "Mn"
    )


def curated_ids() -> dict[str, str]:
    source = CATALOG.read_text(encoding="utf-8").split("];", 1)[0]
    return {hanzi: identifier for identifier, hanzi in re.findall(r'id:"([^"]+)",hanzi:"([^"]+)"', source)}


def main() -> None:
    vocabulary = json.loads(VOCABULARY.read_text(encoding="utf-8"))
    overrides = curated_ids()
    by_level = {
        level: [word for word in vocabulary if word["level"] == level and word["translationAvailable"]]
        for level in CURRICULUM
    }
    lessons = []
    chapter_names = ["Fondations", "Réflexes", "Dialogues", "Maîtrise"]
    for level, units in CURRICULUM.items():
        for base_order, (unit_title, unit_description, keywords) in enumerate(units, start=1):
            normalized_keywords = [normalize(keyword) for keyword in keywords]
            def relevance(word: dict) -> int:
                definition = normalize(word["french"])
                return sum(
                    3 if definition == keyword else 1
                    for keyword in normalized_keywords
                    if re.search(rf"\b{re.escape(keyword)}\b", definition)
                )
            matches = [word for word in by_level[level] if relevance(word) > 0]
            matches.sort(key=lambda word: (-relevance(word), word["id"]))
            pool = matches + [word for word in by_level[level] if word not in matches]
            for chapter, chapter_name in enumerate(chapter_names):
                unit_order = (base_order - 1) * 4 + chapter + 1
                start = (chapter * 6) % max(1, len(pool))
                selected = (pool + pool)[start:start + 6]
                chapter_title = f"{unit_title} · {chapter_name}"
                for lesson_order, (kind, phase_title, goal, duration, xp) in enumerate(PHASES, start=1):
                    lessons.append({
                        "id": f"hsk-{level}-u{unit_order}-l{lesson_order}",
                        "level": level,
                        "unitId": f"hsk-{level}-u{unit_order}",
                        "unitTitle": chapter_title,
                        "unitDescription": unit_description,
                        "unitOrder": unit_order,
                        "lessonOrder": lesson_order,
                        "kind": kind,
                        "title": f"{phase_title} · {chapter_title}",
                        "theme": unit_title,
                        "goal": f"{goal} Traduire des mots et des phrases dans les deux sens.",
                        "durationMinutes": duration,
                        "xp": xp * 2,
                        "words": [overrides.get(word["hanzi"], word["id"]) for word in selected],
                    })

    OUTPUT.write_text(json.dumps(lessons, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(lessons)} lessons across {len(CURRICULUM)} HSK levels in {OUTPUT}")


if __name__ == "__main__":
    main()
