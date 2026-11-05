/**
 * Presentación y opciones de un platillo (capa de dominio): las mismas reglas que
 * menu-opciones.js de la web, para que la app y la página se comporten igual.
 */
import { describe, expect, it } from '@jest/globals';

import {
  addOne,
  canAddMore,
  createSelection,
  displayName,
  groupRule,
  menuPrice,
  missingChoices,
  needsChoice,
  optionsPayload,
  optionsSummary,
  priceBadge,
  reminders,
  removeOne,
  selectionKey,
  selectVariant,
  toggle,
  unitPrice,
} from '@/domain/menu-options';
import type { OptionGroup } from '@/types/product';

import { platillo } from '../fixtures/productos';

const tipoPapa: OptionGroup = {
  id: 21,
  name: 'Tipo de papa',
  label: 'Elige tu papa',
  min: 1,
  max: 1,
  maxPerOption: 1,
  options: [
    { id: 130, name: 'Francesas', detail: '', price: 0 },
    { id: 131, name: 'Crisscut', detail: '', price: 0 },
  ],
};

const sazonador: OptionGroup = {
  id: 22,
  name: 'Sazonador',
  label: 'Elige tu sazonador',
  min: 0,
  max: 1,
  maxPerOption: 1,
  options: [{ id: 135, name: 'Flamin Hot', detail: '', price: 0 }],
};

const especialidades: OptionGroup = {
  id: 23,
  name: 'Especialidades',
  label: 'Agrega especialidades (máx. 5)',
  min: 0,
  max: 5,
  maxPerOption: 3,
  options: [
    { id: 137, name: 'Porción de Boneless', detail: '4 piezas', price: 38 },
    { id: 138, name: 'Porción de Dedos de Queso', detail: '3 piezas', price: 40 },
  ],
};

const armaTusPapas = platillo({ key: 'papas-48', id: 48, name: 'Arma tus Papas', price: 95, optionGroups: [tipoPapa, sazonador, especialidades] });
const margarita = platillo({
  key: 'margarita',
  id: 100,
  name: 'Margarita',
  price: 80,
  section: 'bebidas',
  variants: [
    { id: 543, name: 'Vaso', price: 80 },
    { id: 544, name: 'Litro', price: 160 },
  ],
});

const [francesas, crisscut] = tipoPapa.options;
const [boneless, dedos] = especialidades.options;

describe('opciones de un platillo', () => {
  it('pide elegir si hay presentaciones, listas o ingredientes; si no, se agrega directo', () => {
    expect(needsChoice(margarita)).toBe(true);
    expect(needsChoice(armaTusPapas)).toBe(true);
    expect(needsChoice(platillo(), 3)).toBe(true);
    expect(needsChoice(platillo(), 0)).toBe(false);
  });

  it('empieza con la presentación más barata y sin opciones elegidas', () => {
    expect(createSelection(margarita)).toEqual({ variantId: 543, counts: {} });
    expect(createSelection(armaTusPapas)).toEqual({ variantId: null, counts: {} });
  });

  it('una lista de una sola elección funciona como radio', () => {
    let sel = toggle(tipoPapa, francesas, createSelection(armaTusPapas));
    sel = toggle(tipoPapa, crisscut, sel);

    expect(sel.counts).toEqual({ 131: 1 });
    expect(toggle(tipoPapa, crisscut, sel).counts).toEqual({});
  });

  it('respeta las veces por opción y el máximo de la lista', () => {
    let sel = createSelection(armaTusPapas);
    for (let i = 0; i < 4; i++) sel = addOne(especialidades, boneless, sel);
    expect(sel.counts[137]).toBe(3);
    expect(canAddMore(especialidades, boneless, sel)).toBe(false);

    sel = addOne(especialidades, dedos, addOne(especialidades, dedos, addOne(especialidades, dedos, sel)));
    expect(sel.counts[138]).toBe(2);
    expect(canAddMore(especialidades, dedos, sel)).toBe(false);

    sel = removeOne(boneless, sel);
    expect(sel.counts[137]).toBe(2);
  });

  it('el precio suma la presentación y cada opción por su cantidad', () => {
    let papas = toggle(tipoPapa, francesas, createSelection(armaTusPapas));
    papas = addOne(especialidades, boneless, addOne(especialidades, boneless, papas));

    expect(unitPrice(armaTusPapas, papas)).toBe(95 + 38 * 2);
    expect(unitPrice(margarita, selectVariant(createSelection(margarita), 544))).toBe(160);
  });

  it('lo obligatorio bloquea y lo incluido sin elegir solo se recuerda', () => {
    const vacia = createSelection(armaTusPapas);

    expect(missingChoices(armaTusPapas, vacia)).toEqual(['Elige una opción en «Elige tu papa»']);
    expect(reminders(armaTusPapas, vacia)).toEqual(['sazonador']);
    expect(missingChoices(armaTusPapas, toggle(tipoPapa, francesas, vacia))).toEqual([]);
  });

  it('describe la regla de cada lista como la web', () => {
    expect(groupRule(tipoPapa)).toBe('Obligatorio');
    expect(groupRule(sazonador)).toBe('Incluido');
    expect(groupRule(especialidades)).toBe('Opcional · hasta 5');
  });

  it('arma el nombre, el resumen y lo que se manda al servidor', () => {
    let sel = toggle(tipoPapa, francesas, createSelection(armaTusPapas));
    sel = addOne(especialidades, boneless, addOne(especialidades, boneless, sel));

    expect(optionsSummary(armaTusPapas, sel)).toBe('Tipo de papa: Francesas · Especialidades: 2x Porción de Boneless');
    expect(optionsPayload(sel)).toEqual([
      { id: 130, quantity: 1 },
      { id: 137, quantity: 2 },
    ]);
    expect(displayName(margarita, selectVariant(createSelection(margarita), 544))).toBe('Margarita (Litro)');
  });

  it('la misma combinación da la misma llave, sin importar el orden en que se eligió', () => {
    const a = addOne(especialidades, dedos, addOne(especialidades, boneless, createSelection(armaTusPapas)));
    const b = addOne(especialidades, boneless, addOne(especialidades, dedos, createSelection(armaTusPapas)));

    expect(selectionKey(a)).toBe(selectionKey(b));
    expect(selectionKey(a)).not.toBe(selectionKey(createSelection(armaTusPapas)));
  });

  it('muestra el precio de la carta con presentaciones', () => {
    expect(menuPrice(margarita)).toBe('Vaso $80 · Litro $160');
    expect(priceBadge(margarita)).toBe('Desde $80');
    expect(priceBadge(armaTusPapas)).toBe('$95');
  });
});
