export type GuidedKind =
  | "word-zh-fr"
  | "word-fr-zh"
  | "sentence-zh-fr"
  | "sentence-fr-zh"
  | "cloze"
  | "dictation"
  | "pronunciation";

export type GuidedCapabilities = {
  listening: boolean;
  microphone: boolean;
  speechRecognition: boolean;
};

const coreKinds: GuidedKind[] = [
  "word-zh-fr",
  "word-fr-zh",
  "sentence-zh-fr",
  "sentence-fr-zh",
  "cloze",
];

export function buildGuidedSequence(capabilities: GuidedCapabilities, total = 10): GuidedKind[] {
  const sequence = Array.from({ length: total }, (_, index) => coreKinds[index % coreKinds.length]);
  const peripheral: GuidedKind[] = [];
  if (capabilities.listening) peripheral.push("dictation");
  if (capabilities.microphone && capabilities.speechRecognition) peripheral.push("pronunciation");
  peripheral.forEach((kind, index) => { if (index < sequence.length) sequence[index] = kind; });
  return sequence;
}

export function normalizeSpeechTranscript(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/[\s\p{P}\p{S}]/gu, "");
}

export function speechMatches(transcript: string, expectedVariants: string) {
  const normalizedTranscript = normalizeSpeechTranscript(transcript);
  return expectedVariants.split(/[|/]/).some((variant) => normalizeSpeechTranscript(variant) === normalizedTranscript);
}

export function isPeripheralGuidedKind(kind: GuidedKind) {
  return kind === "dictation" || kind === "pronunciation";
}
