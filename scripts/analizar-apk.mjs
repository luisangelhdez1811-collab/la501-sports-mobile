#!/usr/bin/env node
/**
 * Prueba de anti-descompilación: descompila un APK de Release con JADX y genera un
 * reporte en Markdown con lo que vería un atacante.
 *
 *   node scripts/analizar-apk.mjs <app.apk> [reporte.md] [mapping.txt]
 *
 * mapping.txt (lo genera R8 junto al APK) da el porcentaje exacto de clases renombradas.
 * Requiere `jadx` en el PATH (o la variable JADX con su ruta) y Java 11+.
 * Revisa:
 *  - Clases Java/Kotlin: cuántas quedaron con nombres ofuscados por R8 (a, b, c…).
 *  - Código de la app (React Native): que el bundle sea bytecode de Hermes, no JavaScript legible.
 *  - Secretos: llaves privadas, tokens o contraseñas escritas dentro del APK.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, sep } from 'node:path';

const [apk, salida = 'reporte-descompilacion.md', mapping] = process.argv.slice(2);
if (!apk || !existsSync(apk)) {
  console.error('Uso: node scripts/analizar-apk.mjs <app.apk> [reporte.md]');
  process.exit(2);
}

const jadx = process.env.JADX ?? 'jadx';
const destino = mkdtempSync(join(tmpdir(), 'jadx-'));
console.log(`Descompilando ${basename(apk)} con JADX…`);
try {
  execFileSync(jadx, ['--no-debug-info', '--deobf-min', '0', '-d', destino, apk], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
} catch {
  // JADX termina con código 1 si alguna clase no se pudo descompilar; el resto sí sirve.
}

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else yield ruta;
  }
}

// 1. Clases Java/Kotlin
const fuentes = join(destino, 'sources');
const clases = existsSync(fuentes) ? [...archivos(fuentes)].filter((f) => f.endsWith('.java')) : [];
const paquete = (f) => relative(fuentes, f).split(sep).slice(0, -1).join('.');
const nombre = (f) => basename(f, '.java');
// R8 renombra a 1-3 letras y dígitos (a, uJ, lC2…). Lo que conserva su nombre lo exige el
// sistema (Activity, módulos nativos con @DoNotStrip, clases que se buscan desde C++).
const ofuscada = (f) => /^[a-zA-Z]{1,3}\d{0,2}$/.test(nombre(f)) || /^C\d+[a-zA-Z]{0,3}\d{0,2}$/.test(nombre(f));
const ofuscadas = clases.filter(ofuscada);
// JADX muestra las clases que R8 movió al paquete raíz dentro de "defpackage".
const enRaiz = clases.filter((f) => paquete(f) === '' || paquete(f) === 'defpackage');

// Dato exacto desde R8: "original -> nuevo:" por cada clase.
let r8 = null;
if (mapping && existsSync(mapping)) {
  const lineas = readFileSync(mapping, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith(' ') && !l.startsWith('#'));
  const renombradas = lineas.filter((l) => {
    const [origen, destinoClase] = l.replace(/:$/, '').split(' -> ');
    return destinoClase !== undefined && origen !== destinoClase.trim();
  });
  r8 = { total: lineas.length, renombradas: renombradas.length };
}
const porPaquete = new Map();
for (const f of clases) {
  const raiz = paquete(f).split('.').slice(0, 2).join('.') || '(raíz, reempaquetadas por R8)';
  const actual = porPaquete.get(raiz) ?? { total: 0, ofuscadas: 0 };
  actual.total += 1;
  if (ofuscada(f)) actual.ofuscadas += 1;
  porPaquete.set(raiz, actual);
}
const paquetesTop = [...porPaquete.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 12);
const deLaApp = clases.filter((f) => paquete(f).startsWith('com.la501'));

// 2. Bundle de React Native
const recursos = join(destino, 'resources');
const bundle = join(recursos, 'assets', 'index.android.bundle');
let bundleInfo = 'No se encontró `assets/index.android.bundle`.';
let hermes = false;
if (existsSync(bundle)) {
  const cabecera = Buffer.alloc(8);
  const fd = openSync(bundle, 'r');
  readSync(fd, cabecera, 0, 8, 0);
  // Firma de un archivo de bytecode de Hermes: 0x1F1903C103BC1FC6 (little-endian).
  hermes = cabecera.equals(Buffer.from([0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f]));
  const kb = Math.round(statSync(bundle).size / 1024);
  bundleInfo = hermes
    ? `Bytecode de Hermes (${kb} KB, firma \`c61fbc03c103191f\`): el código de la app no está como JavaScript legible.`
    : `⚠️ JavaScript en texto plano (${kb} KB): el código de la app se puede leer.`;
}

// 3. Secretos escritos en el APK
const patrones = [
  ['Llave privada', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Llave de AWS', /AKIA[0-9A-Z]{16}/],
  ['Llave de Google API', /AIza[0-9A-Za-z_-]{35}/],
  ['Token de GitHub', /gh[pousr]_[A-Za-z0-9]{36}/],
  ['Token de Expo', /expo_[A-Za-z0-9]{30,}/],
  ['Credenciales de Twilio', /\bSK[0-9a-f]{32}\b|\bAC[0-9a-f]{32}\b/],
  // Solo en recursos y en el código propio: en las librerías "password" es el nombre de
  // un tipo de campo, no un secreto.
  ['Contraseña escrita', /(?:password|contrase(?:ñ|n)a)\s*[:=]\s*["'][^"'\s]{4,}["']/i, 'propio'],
];
const esPropio = (ruta) => !ruta.startsWith(`sources${sep}`) || ruta.startsWith(join('sources', 'com', 'la501'));
const hallazgos = [];
for (const archivo of archivos(destino)) {
  if (statSync(archivo).size > 30 * 1024 * 1024) continue;
  const ruta = relative(destino, archivo);
  const texto = readFileSync(archivo, 'latin1');
  for (const [tipo, patron, alcance] of patrones) {
    if (alcance === 'propio' && !esPropio(ruta)) continue;
    if (patron.test(texto)) hallazgos.push(`${tipo} en \`${ruta}\``);
  }
}

const pct = (n, d) => (d === 0 ? '0 %' : `${Math.round((n / d) * 100)} %`);
const fecha = new Date().toISOString().slice(0, 10);
const reporte = `# Reporte de descompilación (JADX)

- **APK:** \`${basename(apk)}\` (${(statSync(apk).size / 1024 / 1024).toFixed(1)} MB)
- **Fecha:** ${fecha}
- **Herramienta:** JADX ${(() => {
  try {
    return execFileSync(jadx, ['--version'], { shell: process.platform === 'win32' }).toString().trim();
  } catch {
    return '';
  }
})()}

## 1. Clases Java/Kotlin (R8)

| Medida | Valor |
|---|---|
${r8 ? `| Clases renombradas por R8 (mapping.txt) | ${r8.renombradas} de ${r8.total} (${pct(r8.renombradas, r8.total)}) |
` : ''}| Clases descompiladas | ${clases.length} |
| Con nombre ofuscado (a, b, Ab…) | ${ofuscadas.length} (${pct(ofuscadas.length, clases.length)}) |
| En el paquete raíz (\`defpackage\` en JADX) | ${enRaiz.length} |
| Clases propias que conservan su nombre (\`com.la501…\`) | ${deLaApp.length}: ${deLaApp.map((f) => `\`${nombre(f)}\``).join(', ') || '—'} |

Paquetes con más clases:

| Paquete | Clases | Ofuscadas |
|---|---|---|
${paquetesTop.map(([p, v]) => `| \`${p}\` | ${v.total} | ${pct(v.ofuscadas, v.total)} |`).join('\n')}

Las clases que conservan su nombre son las que Android o el código nativo (C++) buscan por
nombre: \`MainActivity\`, \`MainApplication\`, los módulos de Expo/React Native marcados con
\`@DoNotStrip\` y las de JNI. Sus reglas \`-keep\` vienen de cada librería.

## 2. Código de la app (React Native)

${bundleInfo}

## 3. Secretos dentro del APK

${hallazgos.length === 0 ? 'Sin hallazgos: no hay llaves privadas, tokens ni contraseñas escritas en el APK.' : hallazgos.map((h) => `- ⚠️ ${h}`).join('\n')}

## Resultado

${hermes && ofuscadas.length > 0 && hallazgos.length === 0 ? '✅ **Aprobado**: código Java/Kotlin ofuscado, código de la app en bytecode y sin secretos.' : '❌ **Revisar** los puntos marcados con ⚠️.'}
`;

writeFileSync(salida, reporte);
rmSync(destino, { recursive: true, force: true });
console.log(`Reporte: ${salida}`);
process.exit(hermes && hallazgos.length === 0 ? 0 : 1);
