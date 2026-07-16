/**
 * Integration test for image loading pipeline.
 * Run: node scripts/test-images.mjs
 */
import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const testImages = [
  'resources/3e8e65e7-27eb-41b1-8247-d5b4ac5ef309.png',
  'resources/photo_2026-07-13_23-15-41.jpg'
]

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`✓ ${name}`)
    passed++
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`)
    failed++
  }
}

for (const rel of testImages) {
  const path = join(root, rel)
  await test(`File exists: ${rel}`, async () => {
    if (!existsSync(path)) throw new Error('not found')
  })

  await test(`Sharp metadata: ${rel}`, async () => {
    const meta = await sharp(path).metadata()
    if (!meta.width || !meta.height) throw new Error('no dimensions')
    console.log(`    → ${meta.width}x${meta.height} ${meta.format}`)
  })

  await test(`Preview data URL: ${rel}`, async () => {
    const buffer = await sharp(path)
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .toBuffer()
    const b64 = buffer.toString('base64')
    if (b64.length < 100) throw new Error('empty data')
    console.log(`    → ${Math.round(b64.length / 1024)}KB base64`)
  })

  await test(`Thumbnail: ${rel}`, async () => {
    const buffer = await sharp(path)
      .resize(120, 120, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer()
    if (buffer.length < 50) throw new Error('empty thumbnail')
  })
}

// Test project JSON roundtrip
await test('Project JSON roundtrip', async () => {
  const sample = {
    schemaVersion: 1,
    id: 'test-id',
    name: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvas: {
      width: 1080,
      height: 1080,
      unit: 'px',
      dpi: 72,
      aspectLock: true,
      background: { type: 'color', value: '#FFFFFF' }
    },
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    assets: [
      {
        id: 'asset-1',
        sourcePath: join(root, testImages[0]),
        displayName: 'test.png',
        transform: { x: 0, y: 0, width: 500, height: 500, rotation: 0, flipX: false, flipY: false },
        adjustments: {
          brightness: 0, exposure: 0, contrast: 0, saturation: 0, vibrance: 0,
          highlights: 0, shadows: 0, whites: 0, blacks: 0, temperature: 0, tint: 0, hue: 0,
          sharpness: 0, blur: 0
        },
        status: 'completed'
      }
    ],
    presets: [],
    exportSettings: { format: 'webp', quality: 85, renamePattern: '{project-name}-{index}' }
  }
  const json = JSON.stringify(sample)
  const parsed = JSON.parse(json)
  if (parsed.assets.length !== 1) throw new Error('asset lost')
})

// Test export render composite (all formats)
const formats = ['png', 'jpg', 'webp', 'avif']
for (const format of formats) {
  await test(`Export composite render (${format})`, async () => {
    const imgPath = join(root, testImages[0])
    const canvasW = 1080
    const canvasH = 1080
    const margins = { top: 40, right: 40, bottom: 40, left: 40 }
    const transform = { x: 100, y: 100, width: 800, height: 800 }

    const imageBuffer = await sharp(imgPath)
      .resize(Math.round(transform.width), Math.round(transform.height), { fit: 'fill' })
      .png()
      .toBuffer()

    const bg = sharp({
      create: {
        width: canvasW,
        height: canvasH,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 255 }
      }
    })

    let pipeline = bg.composite([
      {
        input: imageBuffer,
        left: Math.round(margins.left + transform.x),
        top: Math.round(margins.top + transform.y)
      }
    ])

    if (format === 'jpg') {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255, alpha: 255 } })
    }

    let out
    switch (format) {
      case 'png':
        out = await pipeline.png().toBuffer()
        break
      case 'jpg':
        out = await pipeline.jpeg({ quality: 85 }).toBuffer()
        break
      case 'webp':
        out = await pipeline.webp({ quality: 85 }).toBuffer()
        break
      case 'avif':
        out = await pipeline.avif({ quality: 85 }).toBuffer()
        break
    }

    if (out.length < 1000) throw new Error('export too small')
    console.log(`    → ${format} export size ${Math.round(out.length / 1024)}KB`)
  })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
