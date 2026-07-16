'use strict'
/**
 * Isolated background-removal worker.
 *
 * onnxruntime-node (used by @imgly/background-removal-node) and sharp's libvips
 * cannot be safely loaded in the same process — co-loading them crashes the
 * process with an access violation. The main process owns sharp, so the ONNX
 * model runs here, in a separate forked process, and returns the cutout bytes.
 *
 * Message in:  { imglyPath, publicPath, inputData (base64 png), model }
 * Messages out: { type: 'progress', current, total }
 *               { type: 'done', data: <base64 png> }
 *               { type: 'error', message }
 */

process.once('message', async (msg) => {
  try {
    const { imglyPath, publicPath, inputData, model } = msg
    const mod = require(imglyPath)
    const removeBackground = mod.removeBackground || (mod.default && mod.default.removeBackground)

    const input = Buffer.from(inputData, 'base64')
    const blob = new Blob([input], { type: 'image/png' })

    const out = await removeBackground(blob, {
      publicPath,
      model: model || 'small',
      output: { format: 'image/png', quality: 1 },
      progress: (key, current, total) => {
        if (typeof key === 'string' && key.startsWith('compute') && process.send) {
          process.send({ type: 'progress', current, total })
        }
      }
    })

    const buffer = Buffer.from(await out.arrayBuffer())
    process.send({ type: 'done', data: buffer.toString('base64') })
    process.exit(0)
  } catch (err) {
    if (process.send) {
      process.send({ type: 'error', message: String((err && err.stack) || err) })
    }
    process.exit(1)
  }
})
