/**
 * Turn a user-picked image file into a small, square, compressed JPEG data URL
 * suitable for storing on the profile (center-cropped to 256×256). Keeps the
 * stored value tiny (~15–30 KB) so it fits comfortably in a text column.
 */

const AVATAR_SIZE = 256
const MAX_INPUT_BYTES = 12 * 1024 * 1024 // reject absurdly large uploads early

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the image.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That image could not be loaded.'))
    img.src = src
  })
}

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That image is too large. Pick one under 12 MB.')
  }

  const img = await loadImage(await readAsDataUrl(file))

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image.')

  // Cover-fit: scale so the image fills the square, then center-crop.
  const scale = Math.max(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (AVATAR_SIZE - w) / 2, (AVATAR_SIZE - h) / 2, w, h)

  return canvas.toDataURL('image/jpeg', 0.82)
}
