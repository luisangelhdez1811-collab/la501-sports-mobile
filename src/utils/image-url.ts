// Phone-sized images: smaller downloads and a lighter on-device image cache.
// Cloudinary and Unsplash resize on their CDN, so quality stays good at this width.
// Plain string handling on purpose: React Native's URL class doesn't support editing
// pathname/searchParams.
const MAX_WIDTH = 800;

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

export function sizedImageUrl(url: string, width = MAX_WIDTH): string {
  const cloudinary = url.match(CLOUDINARY);
  if (cloudinary) {
    // …/image/upload/[transformations/]v123/id.jpg
    const [, base, rest] = cloudinary;
    const [first, ...others] = rest.split('/');
    if (first.includes('w_')) return url;
    const resize = `w_${width},c_limit`;
    const hasTransform = !/^v\d+$/.test(first) && others.length > 0;
    return hasTransform
      ? `${base}${first},${resize}/${others.join('/')}`
      : `${base}f_auto,q_auto,${resize}/${rest}`;
  }

  if (UNSPLASH.test(url)) {
    const withoutWidth = url.replace(/([?&])w=\d+&?/, '$1').replace(/[?&]$/, '');
    return `${withoutWidth}${withoutWidth.includes('?') ? '&' : '?'}w=${width}`;
  }

  return url;
}
