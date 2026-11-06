import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * A profile photo is shown at most a few hundred pixels wide (app and website), so it is
 * sent at this width: a phone photo, even cropped to a square, is several MB and the
 * server rejects files over 2 MB. At 512 px and 80 % JPEG it weighs ~50–150 KB.
 */
export const AVATAR_WIDTH = 512;
const AVATAR_QUALITY = 0.8;

export type AvatarFile = { uri: string; mimeType: 'image/jpeg'; width: number; height: number };

/**
 * Shrinks the photo the person picked before uploading it. Never enlarges a smaller one.
 * Always JPEG: it's the lightest of the formats the server accepts and has no transparency
 * to lose in a round avatar.
 */
export async function shrinkForAvatar(photo: { uri: string; width?: number }): Promise<AvatarFile> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (!photo.width || photo.width > AVATAR_WIDTH) {
    context.resize({ width: AVATAR_WIDTH, height: null });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: AVATAR_QUALITY });
  return { uri: result.uri, mimeType: 'image/jpeg', width: result.width, height: result.height };
}
