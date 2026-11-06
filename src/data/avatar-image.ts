import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * A profile photo is shown at most a few hundred pixels wide (app and website), so it is
 * sent as a square of this side: a phone photo, even cropped, is several MB and the server
 * rejects files over 2 MB. At 512 px and 80 % JPEG it weighs ~50–150 KB.
 */
export const AVATAR_WIDTH = 512;
/** The server's smallest accepted side (and its largest is 4000 px). */
export const AVATAR_MIN_SIDE = 64;
const AVATAR_QUALITY = 0.8;

export type AvatarFile = { uri: string; mimeType: 'image/jpeg'; width: number; height: number };

/** The photo is smaller than the server accepts; enlarging it would only blur it. */
export class AvatarTooSmallError extends Error {
  constructor() {
    super('Avatar photo too small');
    this.name = 'AvatarTooSmallError';
  }
}

/**
 * Prepares the photo the person picked: a centered square (the avatar is round, and a
 * long screenshot can't end up taller than the server allows), at most 512 px, as JPEG
 * (the lightest format the server accepts; no transparency to lose). Never enlarges it.
 */
export async function shrinkForAvatar(photo: { uri: string; width?: number; height?: number }): Promise<AvatarFile> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (photo.width && photo.height) {
    const side = Math.min(photo.width, photo.height);
    if (side < AVATAR_MIN_SIDE) throw new AvatarTooSmallError();
    if (photo.width !== photo.height) {
      context.crop({
        originX: Math.floor((photo.width - side) / 2),
        originY: Math.floor((photo.height - side) / 2),
        width: side,
        height: side,
      });
    }
    if (side > AVATAR_WIDTH) context.resize({ width: AVATAR_WIDTH, height: AVATAR_WIDTH });
  } else {
    // Size unknown: at least never send it wider than needed.
    context.resize({ width: AVATAR_WIDTH, height: null });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: AVATAR_QUALITY });
  return { uri: result.uri, mimeType: 'image/jpeg', width: result.width, height: result.height };
}
