import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, isCorrect, shuffle } from '../src/questions.ts';
import {
  hashPassword,
  verifyPassword,
  digest,
  newToken,
} from '../src/password.ts';
test('sample catalog validates and contains every domain and choice type', () => {
  assert.equal(new Set(questions.map((q) => q.domain)).size, 4);
  assert(questions.some((q) => q.type === 'multiple'));
  assert(questions.every((q) => q.isSample));
});
test('multi-select grading requires the exact set and is independent of order', () => {
  const q = questions.find((q) => q.type === 'multiple')!;
  assert(isCorrect(q, [...q.correctAnswers].reverse()));
  assert(!isCorrect(q, q.correctAnswers.slice(1)));
  assert(
    !isCorrect(q, [
      ...q.correctAnswers,
      q.choices.find((c) => !q.correctAnswers.includes(c.id))!.id,
    ]),
  );
});
test('shuffle retains all questions without modifying source', () => {
  const original = questions.map((q) => q.id);
  assert.deepEqual(
    shuffle(questions)
      .map((q) => q.id)
      .sort(),
    [...original].sort(),
  );
  assert.deepEqual(
    questions.map((q) => q.id),
    original,
  );
});
test('password hashing uses random salts and rejects invalid passwords', async () => {
  const hash = await hashPassword('correct horse battery');
  assert(await verifyPassword('correct horse battery', hash));
  assert(!(await verifyPassword('incorrect password', hash)));
  assert.notEqual(await hashPassword('correct horse battery'), hash);
  assert(!hash.includes('correct horse'));
  assert(!(await verifyPassword('anything', 'invalid')));
});
test('session tokens are random and hashed', async () => {
  const a = newToken(),
    b = newToken();
  assert.equal(a.length, 64);
  assert.notEqual(a, b);
  assert.notEqual(await digest(a), a);
});
