import { describe, expect, it } from '@jest/globals';

import { PRIVACY_NOTICE, TERMS, type LegalDocument } from '@/content/legal';

const headings = (doc: LegalDocument) => doc.blocks.flatMap((b) => (b.type === 'h2' || b.type === 'h3' ? [b.text] : []));

describe('textos legales', () => {
  it('usan la versión que publica la web, con fecha completa', () => {
    // La app manda al aceptar la versión que dice el servidor: el texto que mostró debe ser esa misma.
    expect(PRIVACY_NOTICE.version).toBe('2026-11-17');
    expect(TERMS.version).toBe('2026-11-17');
    expect(PRIVACY_NOTICE.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('el aviso explica lo que hace la app en el teléfono', () => {
    const titulos = headings(PRIVACY_NOTICE);
    expect(titulos).toContain('En la aplicación móvil');
    // Va dentro de la sección de cookies y terceros, antes de los encargados.
    expect(titulos.indexOf('En la aplicación móvil')).toBeLessThan(titulos.indexOf('7. Encargados y transferencias'));
  });

  it('dice qué cambió, para mostrarlo al pedir la aceptación', () => {
    expect(PRIVACY_NOTICE.changes.length).toBeGreaterThan(0);
    expect(TERMS.changes.length).toBeGreaterThan(0);
  });

  it('el enlace para eliminar la cuenta sin la app es una página https', () => {
    const enlaces = TERMS.blocks.flatMap((b) => (b.type === 'p' && b.link ? [b.link] : []));
    expect(enlaces).toEqual([{ label: 'Eliminar mi cuenta', url: expect.stringMatching(/^https:\/\/.+\/eliminar-cuenta$/) }]);
  });
});
