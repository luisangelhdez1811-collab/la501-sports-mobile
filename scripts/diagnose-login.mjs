#!/usr/bin/env node
/**
 * Shows what the API answers to a login, without revealing secrets:
 *   node scripts/diagnose-login.mjs
 * The password is typed hidden, sent only to the API, and never printed. Tokens in the
 * response are replaced by their length. The session it creates is closed at the end.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = await readFile(join(root, 'src', 'config', 'api.ts'), 'utf8');
const BASE_URL = config.match(/API_BASE_URL\s*=\s*'([^']+)'/)?.[1];
if (!BASE_URL?.startsWith('https://')) throw new Error('API_BASE_URL not found');

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
const writeOutput = rl._writeToOutput.bind(rl);
let hiddenPrompt = null;
// While a hidden question is open, echo "*" instead of the typed characters.
rl._writeToOutput = (text) => {
  if (!hiddenPrompt) return writeOutput(text);
  // Redraws repeat the prompt followed by the typed text: mask the typed part.
  if (text.startsWith(hiddenPrompt)) return writeOutput(hiddenPrompt + '*'.repeat(text.length - hiddenPrompt.length));
  rl.output.write(/[\r\n]/.test(text) ? '\n' : '*');
};

// Lines can arrive before their question is asked (pasted or piped input): queue them.
const lines = [];
const waiting = [];
rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));

function ask(question, { hidden = false } = {}) {
  hiddenPrompt = hidden ? question : null;
  rl.setPrompt(question);
  rl.prompt();
  return lines.length ? Promise.resolve(lines.shift()) : new Promise((resolve) => waiting.push(resolve));
}

// Replace anything that looks like a credential with a placeholder.
function redact(value, key = '') {
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  }
  if (typeof value === 'string' && /token|secret|password|respuesta|answer/i.test(key)) {
    return `<oculto: ${value.length} caracteres>`;
  }
  return value;
}

const email = (await ask('Correo: ')).trim().toLowerCase();
const password = await ask('Contraseña (no se muestra): ', { hidden: true });
rl.close();

const res = await fetch(`${BASE_URL}/app/auth/login`, {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = null;
}

console.log(`\nHTTP ${res.status}  ${res.headers.get('content-type') ?? ''}`);
console.log(body ? JSON.stringify(redact(body), null, 2) : `(no es JSON) ${text.slice(0, 300)}`);

// Close the session this test created.
const token = body?.token ?? body?.access_token ?? body?.data?.token ?? body?.data?.access_token;
if (typeof token === 'string' && token) {
  await fetch(`${BASE_URL}/app/auth/logout`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  }).catch(() => {});
  console.log('\n(Sesión de prueba cerrada)');
}
