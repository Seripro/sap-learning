import test from 'node:test';
import assert from 'node:assert/strict';
import {
  questions,
  questionSchema,
  isCorrect,
  shuffle,
  availableQuestionIds,
} from '../src/questions.ts';
import {
  hashPassword,
  verifyPassword,
  digest,
  newToken,
} from '../src/password.ts';
test('catalog validates and contains every domain and choice type', () => {
  assert.equal(new Set(questions.map((q) => q.domain)).size, 4);
  assert(questions.some((q) => q.type === 'multiple'));
});
test('question validation accepts sample and non-sample questions and rejects invalid answers', () => {
  const question = questions[0];
  assert(questionSchema.safeParse({ ...question, isSample: true }).success);
  assert(questionSchema.safeParse({ ...question, isSample: false }).success);
  assert(
    !questionSchema.safeParse({ ...question, correctAnswers: ['missing'] })
      .success,
  );
  assert(
    !questionSchema.safeParse({ ...question, choiceExplanations: {} }).success,
  );
});
test('review and bookmark IDs exclude removed questions without changing stored IDs', () => {
  const stored = ['removed', 'available'];
  assert.deepEqual(availableQuestionIds(stored, [{ id: 'available' }]), [
    'available',
  ]);
  assert.deepEqual(stored, ['removed', 'available']);
  assert.deepEqual(availableQuestionIds(stored, []), []);
  assert.deepEqual(
    availableQuestionIds(stored, [{ id: 'removed' }, { id: 'available' }]),
    stored,
  );
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
