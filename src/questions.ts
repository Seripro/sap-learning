import { z } from 'zod';
import raw from '../data/questions.json' with { type: 'json' };
const schema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    domain: z.string().min(1),
    services: z.array(z.string()),
    type: z.enum(['single', 'multiple']),
    question: z.string().min(1),
    choices: z
      .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
      .min(2),
    correctAnswers: z.array(z.string()).min(1),
    explanation: z.string().min(1),
    choiceExplanations: z.record(z.string(), z.string().min(1)),
    references: z.array(z.string().url()),
    isSample: z.boolean(),
  })
  .superRefine((q, c) => {
    const ids = q.choices.map((x) => x.id);
    if (
      new Set(ids).size !== ids.length ||
      new Set(q.correctAnswers).size !== q.correctAnswers.length ||
      q.correctAnswers.some((id) => !ids.includes(id)) ||
      ids.some((id) => !q.choiceExplanations[id]) ||
      (q.type === 'single' && q.correctAnswers.length !== 1) ||
      (q.type === 'multiple' && q.correctAnswers.length < 2)
    )
      c.addIssue({
        code: 'custom',
        message: '選択肢・正解・解説の指定が不正です',
      });
  });
export const questions = z.array(schema).parse(raw);
if (new Set(questions.map((q) => q.id)).size !== questions.length)
  throw new Error('問題IDが重複しています');
export type Question = z.infer<typeof schema>;
export const domains = [...new Set(questions.map((q) => q.domain))];
export function isCorrect(q: Question, selected: string[]) {
  return (
    selected.length === q.correctAnswers.length &&
    q.correctAnswers.every((id) => selected.includes(id))
  );
}
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(
      (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (i + 1),
    );
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
