export type User = { id: string; username: string };
export type Catalog = {
  id: string;
  domain: string;
  question: string;
  isSample: boolean;
};
export type History = {
  questionId: string;
  domain: string;
  correct: boolean;
  uncertain: boolean;
  at: number;
};
export type Summary = {
  id: string;
  createdAt: number;
  total: number;
  answered: number;
  correct: number;
};
export type State = {
  user: User;
  domains: string[];
  catalog: Catalog[];
  bookmarks: string[];
  wrong: string[];
  history: History[];
  stats: {
    answered: number;
    correct: number;
    firstAnswered: number;
    firstCorrect: number;
  };
  exercises: Summary[];
};
export type PublicQuestion = Catalog & {
  version: number;
  services: string[];
  type: 'single' | 'multiple';
  choices: { id: string; text: string }[];
  answer: null | {
    selected: string[];
    correct: boolean;
    uncertain: boolean;
    correctAnswers: string[];
    explanation: string;
    choiceExplanations: Record<string, string>;
    references: string[];
  };
};
export type Exercise = { id: string; questions: PublicQuestion[] };
export async function api<T>(action: string, data?: unknown): Promise<T> {
  const response = await fetch('/api/' + action, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers:
      data === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? '通信に失敗しました');
  return result as T;
}
export const percent = (correct: number, total: number) =>
  total ? Math.round((correct / total) * 100) : 0;
