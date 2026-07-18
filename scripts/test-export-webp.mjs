import sharp from 'sharp'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const imgPath = join(root, 'resources/3e8e65e7-27eb-41b1-8247-d5b4ac5ef309.png')

async function test(name, fn) {
  try {
    await fn()
    console.log(`✓ ${name}`)
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`)
  }
}

await test('transparent bg webp', async () => {
  const imageBuffer = await sharp(imgPath).resize(800, 800).png().toBuffer()
  const bg = sharp({
    create: { width: 1080, height: 1080, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  await bg
    .composite([{ input: imageBuffer, left: 140, top: 140 }])
    .webp({ quality: 85 })
    .toBuffer()
})

await test('with rotation (clipped)', async () => {
  const imageBuffer = await sharp(imgPath)
    .resize(800, 800)
    .rotate(45, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const meta = await sharp(imageBuffer).metadata()
  const left = 140
  const top = 140
  const canvasWidth = 1080
  const canvasHeight = 1080
  const cropLeft = Math.max(0, -left)
  const cropTop = Math.max(0, -top)
  const placeLeft = Math.max(0, left)
  const placeTop = Math.max(0, top)
  const cropWidth = Math.min((meta.width ?? 0) - cropLeft, canvasWidth - placeLeft)
  const cropHeight = Math.min((meta.height ?? 0) - cropTop, canvasHeight - placeTop)

  const clipped = await sharp(imageBuffer)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer()

  const bg = sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 }
    }
  })
  await bg
    .composite([{ input: clipped, left: placeLeft, top: placeTop }])
    .webp({ quality: 85, alphaQuality: 85 })
    .toBuffer()
})

await test('without png encode (old bug)', async () => {
  const imageBuffer = await sharp(imgPath).resize(800, 800).toBuffer()
  const bg = sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 }
    }
  })
  await bg
    .composite([{ input: imageBuffer, left: 140, top: 140 }])
    .webp({ quality: 85 })
    .toBuffer()
})

await test('linear contrast', async () => {
  const imageBuffer = await sharp(imgPath).resize(800, 800).linear(1.2, -25.6).png().toBuffer()
  const bg = sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 }
    }
  })
  await bg
    .composite([{ input: imageBuffer, left: 140, top: 140 }])
    .webp({ quality: 85 })
    .toBuffer()
})

await test('sharpen blur chain', async () => {
  const imageBuffer = await sharp(imgPath)
    .resize(800, 800)
    .blur(0.5)
    .sharpen({ sigma: 1 })
    .png()
    .toBuffer()
  const bg = sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 }
    }
  })
  await bg
    .composite([{ input: imageBuffer, left: 140, top: 140 }])
    .webp({ quality: 85 })
    .toBuffer()
})
