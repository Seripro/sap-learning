import { defineHandler } from 'void';
import { HTTPException } from 'hono/http-exception';
import { handle } from '../../src/server';
const handler = defineHandler(async (c) => {
  try {
    return c.json(await handle(c));
  } catch (error) {
    if (error instanceof HTTPException)
      return c.json({ error: error.message }, error.status);
    console.error(
      'API failure',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return c.json(
      { error: '処理に失敗しました。時間をおいてお試しください' },
      500,
    );
  }
});
export const GET = handler;
export const POST = handler;
