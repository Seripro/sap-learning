import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db, eq, and, gt, lt, sql, desc } from 'void/db';
import { users, sessions, exercises, bookmarks, limits } from '../db/schema';
import {
  questions,
  domains,
  isCorrect,
  shuffle,
  type Question,
} from './questions';
import { digest, hashPassword, verifyPassword, newToken } from './password';
import { z } from 'zod';
type Answer = {
  selected: string[];
  correct: boolean;
  uncertain: boolean;
  at: number;
};
type Exercise = { questions: Question[]; answers: Record<string, Answer> };
function fail(
  status: 400 | 401 | 403 | 404 | 409 | 429,
  message: string,
): never {
  throw new HTTPException(status, { message });
}
const credentials = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,24}$/, 'IDは半角英数字・_の3〜24文字です')
    .transform((x) => x.toLowerCase()),
  password: z.string().min(12, 'パスワードは12文字以上です').max(128),
});
function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) fail(400, result.error.issues[0].message);
  return result.data;
}
async function body(c: Context) {
  if (c.req.header('origin') !== new URL(c.req.url).origin)
    fail(403, '送信元を確認できません。画面を再読み込みしてください');
  if (!c.req.header('content-type')?.startsWith('application/json'))
    fail(400, 'JSONで送信してください');
  const raw = await c.req.text();
  if (raw.length > 8192) fail(400, '入力が長すぎます');
  try {
    return JSON.parse(raw);
  } catch {
    return fail(400, '入力形式が不正です');
  }
}
async function current(c: Context) {
  const token = getCookie(c, 'sap_session');
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.token, await digest(token)),
        gt(sessions.expiresAt, Date.now()),
      ),
    );
  return row ?? null;
}
async function session(c: Context, userId: string) {
  await db.delete(sessions).where(lt(sessions.expiresAt, Date.now()));
  const token = newToken();
  await db.insert(sessions).values({
    token: await digest(token),
    userId,
    expiresAt: Date.now() + 7 * 86400000,
  });
  setCookie(c, 'sap_session', token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 86400,
  });
}
async function limit(key: string, max: number, window: number) {
  const now = Date.now();
  const [row] = await db
    .insert(limits)
    .values({ key, count: 1, expiresAt: now + window })
    .onConflictDoUpdate({
      target: limits.key,
      set: {
        count: sql`CASE WHEN ${limits.expiresAt} <= ${now} THEN 1 ELSE ${limits.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${limits.expiresAt} <= ${now} THEN ${now + window} ELSE ${limits.expiresAt} END`,
      },
    })
    .returning();
  if (row.count > max)
    fail(429, '試行回数が上限に達しました。時間をおいてお試しください');
}
function publicExercise(id: string, data: Exercise) {
  return {
    id,
    questions: data.questions.map((q) => {
      const answer = data.answers[q.id];
      const {
        correctAnswers,
        explanation,
        choiceExplanations,
        references,
        ...publicQ
      } = q;
      return {
        ...publicQ,
        answer: answer
          ? {
              ...answer,
              correctAnswers,
              explanation,
              choiceExplanations,
              references,
            }
          : null,
      };
    }),
  };
}
async function owned(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, id), eq(exercises.userId, userId)));
  if (!row) fail(404, '演習が見つかりません');
  return { ...row, parsed: JSON.parse(row.data) as Exercise };
}
export async function handle(c: Context) {
  c.header('Cache-Control', 'no-store');
  const action = c.req.param('action');
  const input = c.req.method === 'POST' ? await body(c) : null;
  if (
    c.req.method === 'POST' &&
    (action === 'register' || action === 'login')
  ) {
    const { username, password } = validate(credentials, input);
    const ip = c.req.header('cf-connecting-ip') ?? 'local';
    await db.delete(limits).where(lt(limits.expiresAt, Date.now()));
    await limit('ip:' + (await digest(ip)), 30, 15 * 60000);
    await limit('id:' + username, 10, 15 * 60000);
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    if (action === 'register') {
      await limit('register:' + (await digest(ip)), 10, 3600000);
      if (user) fail(409, 'このユーザーIDは使用されています');
      const value = {
        id: crypto.randomUUID(),
        username,
        password: await hashPassword(password),
        createdAt: Date.now(),
      };
      const inserted = await db
        .insert(users)
        .values(value)
        .onConflictDoNothing()
        .returning();
      if (!inserted.length) fail(409, 'このユーザーIDは使用されています');
      user = value;
    } else {
      // Perform the same password derivation for unknown IDs.
      const dummy =
        'pbkdf2:100000:00000000000000000000000000000000:' + '0'.repeat(64);
      const valid = await verifyPassword(password, user?.password ?? dummy);
      if (!user || !valid) fail(401, 'IDまたはパスワードが違います');
    }
    await session(c, user.id);
    return { user: { id: user.id, username: user.username } };
  }
  const user = await current(c);
  if (action === 'me' && c.req.method === 'GET') return { user };
  if (!user) fail(401, 'ログインしてください');
  if (action === 'logout' && c.req.method === 'POST') {
    const token = getCookie(c, 'sap_session');
    if (token)
      await db.delete(sessions).where(eq(sessions.token, await digest(token)));
    deleteCookie(c, 'sap_session', { path: '/' });
    return { ok: true };
  }
  if (action === 'password' && c.req.method === 'POST') {
    const p = validate(
      z.object({
        current: z.string().max(128),
        password: z.string().min(12).max(128),
      }),
      input,
    );
    await limit('password:' + user.id, 10, 15 * 60000);
    const [record] = await db.select().from(users).where(eq(users.id, user.id));
    if (!(await verifyPassword(p.current, record.password)))
      fail(400, '現在のパスワードが違います');
    await db
      .update(users)
      .set({ password: await hashPassword(p.password) })
      .where(eq(users.id, user.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await session(c, user.id);
    return { ok: true };
  }
  if (action === 'state' && c.req.method === 'GET') {
    const rows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.userId, user.id))
      .orderBy(desc(exercises.createdAt));
    const marked = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, user.id));
    const history = rows
      .flatMap((row) => {
        const d = JSON.parse(row.data) as Exercise;
        return d.questions.flatMap((q) =>
          d.answers[q.id]
            ? [
                {
                  questionId: q.id,
                  domain: q.domain,
                  version: q.version,
                  ...d.answers[q.id],
                },
              ]
            : [],
        );
      })
      .sort((a, b) => a.at - b.at);
    const first = new Map<string, (typeof history)[number]>(),
      latest = new Map<string, (typeof history)[number]>();
    for (const h of history) {
      if (!first.has(h.questionId)) first.set(h.questionId, h);
      latest.set(h.questionId, h);
    }
    const summaries = rows.map((row) => {
      const d = JSON.parse(row.data) as Exercise;
      return {
        id: row.id,
        createdAt: row.createdAt,
        total: d.questions.length,
        answered: Object.keys(d.answers).length,
        correct: Object.values(d.answers).filter((a) => a.correct).length,
      };
    });
    return {
      user,
      domains,
      catalog: questions.map(({ id, domain, question, isSample }) => ({
        id,
        domain,
        question,
        isSample,
      })),
      bookmarks: marked.map((b) => b.questionId),
      history,
      wrong: [...latest.values()]
        .filter((a) => !a.correct || a.uncertain)
        .map((a) => a.questionId),
      stats: {
        answered: history.length,
        correct: history.filter((a) => a.correct).length,
        firstAnswered: first.size,
        firstCorrect: [...first.values()].filter((a) => a.correct).length,
      },
      exercises: summaries,
    };
  }
  if (action === 'exercise' && c.req.method === 'GET') {
    const row = await owned(c.req.query('id') ?? '', user.id);
    return publicExercise(row.id, row.parsed);
  }
  if (action === 'start' && c.req.method === 'POST') {
    const p = validate(
      z.object({
        domain: z.string(),
        count: z.number().int().min(1).max(50),
        mode: z.enum(['all', 'wrong', 'bookmarks']),
      }),
      input,
    );
    await limit('start:' + user.id, 60, 3600000);
    let pool = questions.filter(
      (q) => p.domain === 'all' || q.domain === p.domain,
    );
    if (p.mode === 'bookmarks') {
      const marked = await db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, user.id));
      pool = pool.filter((q) => marked.some((m) => m.questionId === q.id));
    }
    if (p.mode === 'wrong') {
      const rows = await db
        .select()
        .from(exercises)
        .where(eq(exercises.userId, user.id));
      const latest = new Map<string, Answer>();
      for (const row of rows) {
        const d = JSON.parse(row.data) as Exercise;
        for (const [id, a] of Object.entries(d.answers)) {
          if (!latest.has(id) || latest.get(id)!.at < a.at) latest.set(id, a);
        }
      }
      pool = pool.filter((q) => {
        const a = latest.get(q.id);
        return a && (!a.correct || a.uncertain);
      });
    }
    if (!pool.length) fail(400, '条件に合う問題がありません');
    const id = crypto.randomUUID(),
      data: Exercise = {
        questions: shuffle(pool).slice(0, p.count),
        answers: {},
      };
    await db.insert(exercises).values({
      id,
      userId: user.id,
      data: JSON.stringify(data),
      revision: 0,
      createdAt: Date.now(),
    });
    return publicExercise(id, data);
  }
  if (action === 'answer' && c.req.method === 'POST') {
    const p = validate(
      z.object({
        exerciseId: z.string(),
        questionId: z.string(),
        selected: z.array(z.string()).min(1).max(10),
        uncertain: z.boolean(),
      }),
      input,
    );
    const row = await owned(p.exerciseId, user.id),
      q = row.parsed.questions.find((q) => q.id === p.questionId);
    if (!q) fail(404, '問題が見つかりません');
    if (row.parsed.answers[q.id]) fail(409, 'この問題は回答済みです');
    if (
      new Set(p.selected).size !== p.selected.length ||
      p.selected.some((id) => !q.choices.some((x) => x.id === id)) ||
      (q.type === 'single' && p.selected.length !== 1)
    )
      fail(400, '選択肢を確認してください');
    row.parsed.answers[q.id] = {
      selected: p.selected,
      correct: isCorrect(q, p.selected),
      uncertain: p.uncertain,
      at: Date.now(),
    };
    const updated = await db
      .update(exercises)
      .set({ data: JSON.stringify(row.parsed), revision: row.revision + 1 })
      .where(
        and(eq(exercises.id, row.id), eq(exercises.revision, row.revision)),
      )
      .returning({ id: exercises.id });
    if (!updated.length)
      fail(409, '別の画面で更新されています。再読み込みしてください');
    return publicExercise(row.id, row.parsed);
  }
  if (action === 'bookmark' && c.req.method === 'POST') {
    const p = validate(
      z.object({ questionId: z.string(), marked: z.boolean() }),
      input,
    );
    if (!questions.some((q) => q.id === p.questionId))
      fail(404, '問題が見つかりません');
    if (p.marked)
      await db
        .insert(bookmarks)
        .values({ userId: user.id, questionId: p.questionId })
        .onConflictDoNothing();
    else
      await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, user.id),
            eq(bookmarks.questionId, p.questionId),
          ),
        );
    return { ok: true };
  }
  fail(404, 'ページが見つかりません');
}
