/**
 * Foto de perfil: la app achica la foto antes de subirla (una foto del celular, aunque se
 * recorte, pesa varios MB y el servidor rechaza más de 2 MB). Se simula el módulo nativo
 * expo-image-manipulator: no se procesa una imagen real.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockResize = jest.fn();
const mockCrop = jest.fn();
const mockSave = jest.fn(async (_options: unknown) => ({ uri: 'file:///cache/perfil.jpg', width: 512, height: 512 }));
const mockManipulate = jest.fn((_uri: string) => {
  const context = {
    resize: (size: unknown) => {
      mockResize(size);
      return context;
    },
    crop: (rect: unknown) => {
      mockCrop(rect);
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

import { AVATAR_WIDTH, AvatarTooSmallError, shrinkForAvatar } from '@/data/avatar-image';

describe('Foto de perfil', () => {
  beforeEach(() => {
    mockResize.mockClear();
    mockCrop.mockClear();
    mockSave.mockClear();
    mockManipulate.mockClear();
  });

  it('achica una foto cuadrada grande del celular a 512 × 512', async () => {
    await shrinkForAvatar({ uri: 'file:///fotos/IMG_0001.jpg', width: 3024, height: 3024 });

    expect(mockManipulate).toHaveBeenCalledWith('file:///fotos/IMG_0001.jpg');
    expect(mockCrop).not.toHaveBeenCalled();
    expect(mockResize).toHaveBeenCalledWith({ width: AVATAR_WIDTH, height: AVATAR_WIDTH });
  });

  it('una captura larga se recorta en cuadro al centro: nunca pasa de 4000 px de alto', async () => {
    await shrinkForAvatar({ uri: 'file:///fotos/captura-larga.png', width: 1080, height: 9000 });

    expect(mockCrop).toHaveBeenCalledWith({ originX: 0, originY: 3960, width: 1080, height: 1080 });
    expect(mockResize).toHaveBeenCalledWith({ width: AVATAR_WIDTH, height: AVATAR_WIDTH });
  });

  it('no agranda una foto que ya es pequeña', async () => {
    await shrinkForAvatar({ uri: 'file:///fotos/chica.jpg', width: 300, height: 300 });

    expect(mockResize).not.toHaveBeenCalled();
  });

  it('una foto más chica de lo que acepta el servidor se rechaza antes de subirla', async () => {
    await expect(shrinkForAvatar({ uri: 'file:///fotos/icono.png', width: 40, height: 40 })).rejects.toBeInstanceOf(
      AvatarTooSmallError,
    );
    expect(mockManipulate).toHaveBeenCalledTimes(1);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('si no se conocen las medidas, la achica por si acaso', async () => {
    await shrinkForAvatar({ uri: 'file:///fotos/sin-medidas.png' });

    expect(mockResize).toHaveBeenCalledWith({ width: AVATAR_WIDTH, height: null });
  });

  it('siempre la guarda como JPEG comprimido, que es lo más ligero que acepta el servidor', async () => {
    const foto = await shrinkForAvatar({ uri: 'file:///fotos/captura.png', width: 1080, height: 1080 });

    expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8 });
    expect(foto).toEqual({ uri: 'file:///cache/perfil.jpg', mimeType: 'image/jpeg', width: 512, height: 512 });
  });
});
