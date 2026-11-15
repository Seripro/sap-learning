const iterations = 100000; // Workers Web Crypto PBKDF2 upper bound.
const hex = (v: ArrayBuffer | Uint8Array) =>
  Array.from(v instanceof Uint8Array ? v : new Uint8Array(v), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
export async function digest(value: string) {
  return hex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
}
async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(salt),
        iterations,
        hash: 'SHA-256',
      },
      key,
      256,
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `pbkdf2:${iterations}:${salt}:${await derive(password, salt)}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, rounds, salt, expected] = stored.split(':');
  if (
    algorithm !== 'pbkdf2' ||
    Number(rounds) !== iterations ||
    !salt ||
    !expected
  )
    return false;
  const actual = await derive(password, salt);
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++)
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
export const newToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
