import type { Lesson, VocabularyWord } from "../types/learning";

export type { Lesson, VocabularyWord } from "../types/learning";

export const vocabulary: VocabularyWord[] = [
  { id:"l1-ni",hanzi:"你",pinyin:"nǐ",french:"tu",level:1,theme:"Saluer",example:"你好吗？",exampleFr:"Comment vas-tu ?" },
  { id:"l1-wo",hanzi:"我",pinyin:"wǒ",french:"je / moi",level:1,theme:"Se présenter",example:"我是学生。",exampleFr:"Je suis étudiant(e)." },
  { id:"l1-hao",hanzi:"好",pinyin:"hǎo",french:"bien ; bon",level:1,theme:"Saluer",example:"我很好。",exampleFr:"Je vais très bien." },
  { id:"l1-xiexie",hanzi:"谢谢",pinyin:"xièxie",french:"merci",level:1,theme:"Politesse",example:"谢谢你！",exampleFr:"Merci !" },
  { id:"l1-zaijian",hanzi:"再见",pinyin:"zàijiàn",french:"au revoir",level:1,theme:"Politesse",example:"明天再见。",exampleFr:"À demain." },
  { id:"l1-shi",hanzi:"是",pinyin:"shì",french:"être",level:1,theme:"Se présenter",example:"我是法国人。",exampleFr:"Je suis français(e)." },
  { id:"l1-bu",hanzi:"不",pinyin:"bù",french:"ne… pas",level:1,theme:"Grammaire",example:"我不是老师。",exampleFr:"Je ne suis pas professeur." },
  { id:"l1-ren",hanzi:"人",pinyin:"rén",french:"personne",level:1,theme:"Se présenter",example:"他是中国人。",exampleFr:"Il est chinois." },
  { id:"l1-zhongguo",hanzi:"中国",pinyin:"Zhōngguó",french:"Chine",level:1,theme:"Pays",example:"中国很大。",exampleFr:"La Chine est très grande." },
  { id:"l1-xuexiao",hanzi:"学校",pinyin:"xuéxiào",french:"école",level:1,theme:"Vie quotidienne",example:"学校在这里。",exampleFr:"L’école est ici." },
  { id:"l2-jintian",hanzi:"今天",pinyin:"jīntiān",french:"aujourd’hui",level:2,theme:"Temps",example:"今天很忙。",exampleFr:"Aujourd’hui, je suis très occupé(e)." },
  { id:"l2-xihuan",hanzi:"喜欢",pinyin:"xǐhuan",french:"aimer",level:2,theme:"Loisirs",example:"我喜欢中文。",exampleFr:"J’aime le chinois." },
  { id:"l2-yinwei",hanzi:"因为",pinyin:"yīnwèi",french:"parce que",level:2,theme:"Grammaire",example:"因为下雨，我不去。",exampleFr:"Parce qu’il pleut, je n’y vais pas." },
  { id:"l2-dianshi",hanzi:"电视",pinyin:"diànshì",french:"télévision",level:2,theme:"Loisirs",example:"晚上看电视。",exampleFr:"Le soir, je regarde la télévision." },
  { id:"l2-gongzuo",hanzi:"工作",pinyin:"gōngzuò",french:"travailler ; travail",level:2,theme:"Vie quotidienne",example:"我在家工作。",exampleFr:"Je travaille à la maison." },
  { id:"l3-jingli",hanzi:"经历",pinyin:"jīnglì",french:"expérience",level:3,theme:"Parler de soi",example:"这是一次难忘的经历。",exampleFr:"C’est une expérience inoubliable." },
  { id:"l3-zhunbei",hanzi:"准备",pinyin:"zhǔnbèi",french:"préparer",level:3,theme:"Vie quotidienne",example:"我准备考试。",exampleFr:"Je prépare l’examen." },
  { id:"l3-jiankang",hanzi:"健康",pinyin:"jiànkāng",french:"santé",level:3,theme:"Santé",example:"运动对健康很好。",exampleFr:"Le sport est très bon pour la santé." },
];

export const lessons: Lesson[] = [
  { id:"l1-greetings",level:1,title:"Saluer et se présenter",theme:"Fondations",words:["l1-ni","l1-wo","l1-hao","l1-shi","l1-xiexie"] },
  { id:"l1-daily",level:1,title:"La vie quotidienne",theme:"Fondations",words:["l1-xuexiao","l1-zhongguo","l1-ren","l1-zaijian"] },
  { id:"l2-routine",level:2,title:"Raconter sa journée",theme:"Temps & loisirs",words:["l2-jintian","l2-xihuan","l2-dianshi","l2-gongzuo"] },
  { id:"l3-plans",level:3,title:"Parler de ses projets",theme:"Autonomie",words:["l3-zhunbei","l3-jingli","l3-jiankang"] },
  ...[4,5,6,7,8,9].map(level => ({id:`l${level}-roadmap`,level,title:`Niveau ${level}`,theme:"Programme complet",words:[],locked:true})),
];

export const source = { title:"HSK 3.0 vocabulary, ivankra/hsk30", url:"https://github.com/ivankra/hsk30", version:"2021 standard — 11 092 entries", localFile:"data/hsk30-source.csv" };
