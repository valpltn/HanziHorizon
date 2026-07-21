import lessonPath from "./lesson-path.json";
import type { Lesson, VocabularyWord } from "../types/learning";

export const lessons = lessonPath as Lesson[];

export const source = {
  title: "HSK 3.0 · définitions françaises CFDICT",
  url: "https://github.com/ivankra/hsk30",
  dictionaryUrl: "https://chine.in/mandarin/open/CFDICT/",
  version: "11 092 mots · niveaux 1 à 6 et 7–9",
  localFile: "data/hsk30-source.csv",
};

export const vocabularyPlaceholder: VocabularyWord = {
  id: "catalog-loading",
  hanzi: "学",
  pinyin: "xué",
  french: "apprendre",
  level: 1,
  theme: "Apprentissage",
  example: "我学习中文。",
  exampleFr: "J’apprends le chinois.",
};
