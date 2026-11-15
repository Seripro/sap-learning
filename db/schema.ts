import { integer, sqliteTable, text, primaryKey, index } from 'void/schema-d1';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at').notNull(),
});
export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    data: text('data').notNull(),
    revision: integer('revision').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('exercises_user_id_idx').on(t.userId)],
);
export const bookmarks = sqliteTable(
  'bookmarks',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    questionId: text('question_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })],
);
export const limits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
