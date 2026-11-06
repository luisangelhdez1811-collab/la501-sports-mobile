/**
 * Foto de perfil: la app achica la foto antes de subirla (una foto del celular, aunque se
 * recorte, pesa varios MB y el servidor rechaza más de 2 MB). Se simula el módulo nativo
 * expo-image-manipulator: no se procesa una imagen real.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockResize = jest.fn();
const mockSave = jest.fn(async (_options: unknown) => ({ uri: 'file:///cache/perfil.jpg', width: 512, height: 512 }));
const mockManipulate = jest.fn((_uri: string) => {
  const context = {
    resize: (size: unknown) => {
      mockResize(size);
      return context;
    },
    renderAsync: async () => ({ saveAsync: mockSave }),
  };
  return context;
});

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

import { AVATAR_WIDTH, shrinkForAvatar } from '@/data/avatar-image';

describe('Foto de perfil', () => {
  beforeEach(() => {
    mockResize.mockClear();
    mockSave.mockClear();
    mockManipulate.mockClear();
  });

  it('achica una foto grande del celular a 512 px de ancho', async () => {
    await shrinkForAvatar({ uri: 'file:///fotos/IMG_0001.jpg', width: 3024 });

    expect(mockManipulate).toHaveBeenCalledWith('file:///fotos/IMG_0001.jpg');
    expect(mockResize).toHaveBeenCalledWith({ width: AVATAR_WIDTH, height: null });
  });

  it('no agranda una foto que ya es pequeña', async () => {
    await shrinkForAvatar({ uri: 'file:///fotos/chica.jpg', width: 300 });

    expect(mockResize).not.toHaveBeenCalled();
  });

  it('si no se conoce el ancho, la achica por si acaso', async () => {
    await shrinkForAvatar({ uri: 'file:///fotos/sin-medidas.png' });

    expect(mockResize).toHaveBeenCalledWith({ width: AVATAR_WIDTH, height: null });
  });

  it('siempre la guarda como JPEG comprimido, que es lo más ligero que acepta el servidor', async () => {
    const foto = await shrinkForAvatar({ uri: 'file:///fotos/captura.png', width: 1080 });

    expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8 });
    expect(foto).toEqual({ uri: 'file:///cache/perfil.jpg', mimeType: 'image/jpeg', width: 512, height: 512 });
  });
});
