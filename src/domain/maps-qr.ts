/**
 * The Maps QR of the ticket, the same one the website shows under the total
 * (pedido_confirmacion): the server encodes it and sends its modules as rows of "0" and "1",
 * so the app draws it without a QR or SVG library. Pure functions.
 */

/** A dark or light stretch of a row: drawing runs instead of single modules keeps the views few. */
export type QrRun = { dark: boolean; length: number };

/** White modules around the code, as the QR standard asks (the website uses 4 too). */
export const QR_QUIET_ZONE = 4;

/**
 * The server's rows when they form a real QR: versions 1 to 40 (21 to 177 modules per side),
 * square and only "0" or "1". Anything else is ignored and the ticket shows no QR.
 */
export function toQrModules(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const size = value.length;
  if (size < 21 || size > 177 || (size - 17) % 4 !== 0) return null;
  const valid = value.every((row) => typeof row === 'string' && row.length === size && /^[01]+$/.test(row));
  return valid ? (value as string[]) : null;
}

/** "1110010" → dark 3, light 2, dark 1, light 1. */
export function qrRuns(row: string): QrRun[] {
  const runs: QrRun[] = [];
  for (const module of row) {
    const dark = module === '1';
    const last = runs[runs.length - 1];
    if (last && last.dark === dark) {
      last.length += 1;
    } else {
      runs.push({ dark, length: 1 });
    }
  }
  return runs;
}

/** The same QR as an inline SVG for the printed ticket (expo-print renders HTML). */
export function qrSvg(modules: string[], size: number): string {
  const side = modules.length + QR_QUIET_ZONE * 2;
  const path = modules
    .map((row, y) => {
      let x = QR_QUIET_ZONE;
      return qrRuns(row)
        .map((run) => {
          const start = x;
          x += run.length;
          return run.dark ? `M${start} ${y + QR_QUIET_ZONE}h${run.length}v1h-${run.length}z` : '';
        })
        .join('');
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">` +
    `<rect width="${side}" height="${side}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
  );
}

/** Under the QR, the website's words: GPS opens the exact spot, the written address is a search. */
export function mapsQrCaption(fromAddress: boolean): string {
  return fromAddress ? 'Escanea para buscar tu dirección en Maps' : 'Escanea para abrir la ubicación en Maps';
}
