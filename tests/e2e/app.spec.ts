import { test, expect } from '@playwright/test';
import catalog from '../../data/questions.json' with { type: 'json' };
const password = 'Learning_aws_2026!';
const origin = process.env.APP_URL || 'http://localhost:5173';
const username = () =>
  'test_' + crypto.randomUUID().replaceAll('-', '').slice(0, 12);
test('expired session returns to login and allows signing in again', async ({
  page,
  context,
}) => {
  const id = username();
  await page.goto('/');
  await page.getByRole('button', { name: '新規登録', exact: true }).click();
  await page.getByLabel('ユーザーID', { exact: true }).fill(id);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page.getByLabel('パスワード（確認）', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'アカウントを作成' }).click();
  await expect(
    page.getByRole('heading', { name: '一問ずつ、その先へ。' }),
  ).toBeVisible();
  await context.clearCookies();
  await page
    .getByRole('button', { name: '演習をはじめる', exact: true })
    .last()
    .click();
  await page.getByRole('button', { name: '演習を開始する' }).click();
  await expect(
    page.getByText('セッションが終了しました。もう一度ログインしてください'),
  ).toBeVisible();
  await page.getByLabel('ユーザーID', { exact: true }).fill(id);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'ログイン', exact: true })
    .last()
    .click();
  await expect(
    page.getByRole('heading', { name: '一問ずつ、その先へ。' }),
  ).toBeVisible();
});
test('registration, practice, resume, grading, bookmarks, review, password change and login', async ({
  page,
}) => {
  const id = username();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: '新規登録', exact: true }).click();
  await page.getByLabel('ユーザーID', { exact: true }).fill(id);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page.getByLabel('パスワード（確認）', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'アカウントを作成' }).click();
  await expect(
    page.getByRole('heading', { name: '一問ずつ、その先へ。' }),
  ).toBeVisible();
  await page.screenshot({
    path: '/tmp/sap-dashboard-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .getByRole('button', { name: '演習をはじめる', exact: true })
    .last()
    .click();
  await page
    .getByRole('combobox', { name: '問題数', exact: true })
    .selectOption('3');
  await page.getByRole('button', { name: '演習を開始する' }).click();
  await expect(page.getByText('QUESTION 01', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'ブックマーク切り替え' }).click();
  await page.getByRole('button', { name: '中断してホームへ' }).click();
  await page.reload();
  await page.getByRole('button', { name: /途中の演習を続ける/ }).click();
  for (let i = 0; i < 3; i++) {
    const text = await page.locator('.question-text').innerText();
    const q = catalog.find((q) => q.question === text)!;
    // First question intentionally wrong; the next two correct.
    const ids =
      i === 0
        ? [q.choices.find((c) => !q.correctAnswers.includes(c.id))!.id]
        : q.correctAnswers;
    for (const choice of ids)
      await page
        .locator('.choice')
        .filter({ hasText: q.choices.find((c) => c.id === choice)!.text })
        .click();
    if (i === 0)
      await page.getByLabel('自信がないので、あとで復習する').check();
    await page.getByRole('button', { name: '回答を確定', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: '各選択肢のポイント' }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: i < 2 ? '次の問題へ' : '結果を見る',
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole('heading', { name: '今回の演習結果' }),
  ).toBeVisible();
  await expect(page.locator('.result-score')).toContainText('2');
  await page.getByRole('button', { name: 'ホームへ', exact: true }).click();
  await expect(page.locator('.stat-value').first()).toContainText('3');
  await page
    .getByRole('button', { name: '復習ノート', exact: false })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: '1問の復習リスト' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'ブックマーク 1', exact: true })
    .click();
  await expect(page.locator('.review-question')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: '/tmp/sap-review-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await page
    .getByRole('button', { name: 'アカウント設定', exact: true })
    .click();
  await page.getByLabel('現在のパスワード', { exact: true }).fill(password);
  await page
    .getByLabel('新しいパスワード', { exact: true })
    .fill(password + 'new');
  await page
    .getByLabel('新しいパスワード（確認）', { exact: true })
    .fill(password + 'new');
  await page
    .getByRole('button', { name: 'パスワードを変更', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'パスワードを変更しました',
  );
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'おかえりなさい。' }),
  ).toBeVisible();
  await page.getByLabel('ユーザーID', { exact: true }).fill(id);
  await page.getByLabel('パスワード', { exact: true }).fill(password + 'new');
  await page
    .getByRole('button', { name: 'ログイン', exact: true })
    .last()
    .click();
  await expect(
    page.getByRole('heading', { name: '一問ずつ、その先へ。' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('API isolates users, hides unanswered solutions, rejects CSRF and duplicate answers', async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: {
      Origin: origin,
      'CF-Connecting-IP': crypto.randomUUID(),
    },
  });
  const b = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: {
      Origin: origin,
      'CF-Connecting-IP': crypto.randomUUID(),
    },
  });
  for (const c of [a, b])
    expect(
      (
        await c.post('/api/register', {
          data: { username: username(), password },
        })
      ).status(),
    ).toBe(200);
  const start = await a.post('/api/start', {
    data: { domain: 'all', count: 3, mode: 'all' },
  });
  expect(start.status()).toBe(200);
  const e = await start.json();
  expect(JSON.stringify(e)).not.toContain('correctAnswers');
  expect(e.questions[0].answer).toBeNull();
  expect((await b.get('/api/exercise?id=' + e.id)).status()).toBe(404);
  expect(
    (
      await b.post('/api/answer', {
        data: {
          exerciseId: e.id,
          questionId: e.questions[0].id,
          selected: ['a'],
          uncertain: false,
        },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await a.post('/api/bookmark', {
        headers: { Origin: 'https://evil.example' },
        data: { questionId: e.questions[0].id, marked: true },
      })
    ).status(),
  ).toBe(403);
  const answer = {
    exerciseId: e.id,
    questionId: e.questions[0].id,
    selected: ['a'],
    uncertain: false,
  };
  expect((await a.post('/api/answer', { data: answer })).status()).toBe(200);
  expect((await a.post('/api/answer', { data: answer })).status()).toBe(409);
  expect((await (await b.get('/api/state')).json()).stats.answered).toBe(0);
  const state = await (await a.get('/api/state')).json();
  expect(state.stats.answered).toBe(1);
  const cookie = (await a.storageState()).cookies.find(
    (c) => c.name === 'sap_session',
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('Lax');
  await a.post('/api/logout', { data: {} });
  expect((await a.get('/api/state')).status()).toBe(401);
  await a.dispose();
  await b.dispose();
});
test('login throttling rejects repeated failures', async ({ playwright }) => {
  const c = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: {
      Origin: origin,
      'CF-Connecting-IP': crypto.randomUUID(),
    },
  });
  const id = username();
  for (let i = 0; i < 10; i++)
    expect(
      (
        await c.post('/api/login', { data: { username: id, password } })
      ).status(),
    ).toBe(401);
  expect(
    (await c.post('/api/login', { data: { username: id, password } })).status(),
  ).toBe(429);
  await c.dispose();
});

test('successful logins do not consume the shared IP or ID failure limits', async ({
  playwright,
}) => {
  const c = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: {
      Origin: origin,
      'CF-Connecting-IP': crypto.randomUUID(),
    },
  });
  const id = username();
  expect(
    (
      await c.post('/api/register', { data: { username: id, password } })
    ).status(),
  ).toBe(200);
  for (let i = 0; i < 35; i++)
    expect(
      (
        await c.post('/api/login', { data: { username: id, password } })
      ).status(),
    ).toBe(200);
  const other = username();
  for (let i = 0; i < 10; i++)
    expect(
      (
        await c.post('/api/login', { data: { username: other, password } })
      ).status(),
    ).toBe(401);
  expect(
    (
      await c.post('/api/login', { data: { username: other, password } })
    ).status(),
  ).toBe(429);
  await c.dispose();
});

test('password change invalidates another session', async ({ playwright }) => {
  const headers = { Origin: origin, 'CF-Connecting-IP': crypto.randomUUID() };
  const a = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  const b = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  const id = username();
  expect(
    (
      await a.post('/api/register', { data: { username: id, password } })
    ).status(),
  ).toBe(200);
  expect(
    (await b.post('/api/login', { data: { username: id, password } })).status(),
  ).toBe(200);
  expect(
    (
      await a.post('/api/password', {
        data: { current: password, password: password + 'new' },
      })
    ).status(),
  ).toBe(200);
  expect((await b.get('/api/state')).status()).toBe(401);
  expect((await a.get('/api/state')).status()).toBe(200);
  await a.dispose();
  await b.dispose();
});
