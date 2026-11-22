// Vórtex Lens - OCR local con Tesseract.js.
// El motor Tesseract se ejecuta dentro del navegador (WebAssembly): la imagen
// nunca se sube a ningun servidor. La primera vez que se usa un idioma se
// descarga el modelo (~5-15 MB) y queda en cache del navegador.

// URL de Vórtex Notes para enviar el texto extraido.
export const NOTES_URL = 'https://vortex-notes-two.vercel.app'

export interface OcrLang {
  value: string
  label: string
}

export const OCR_LANGS: OcrLang[] = [
  { value: 'spa', label: 'Español' },
  { value: 'eng', label: 'Inglés' },
  { value: 'spa+eng', label: 'Español + Inglés' },
  { value: 'por', label: 'Portugués' },
  { value: 'fra', label: 'Francés' },
]

export function encodeImport(title: string, text: string, source: string): string {
  const payload = JSON.stringify({ t: title, x: text, s: source })
  const bytes = new TextEncoder().encode(payload)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function notesImportUrl(title: string, text: string, source: string): string {
  return `${NOTES_URL}#import=${encodeImport(title, text, source)}`
}

export function countWords(t: string): number {
  const clean = t.trim()
  return clean ? clean.split(/\s+/).length : 0
}

export function lensFileName(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `vortex-lens-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.txt`
}

export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

// ---------- Camara ----------

export async function openCamera(video: HTMLVideoElement, facing: 'environment' | 'user'): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  })
  video.srcObject = stream
  await video.play()
}

export function closeCamera(video: HTMLVideoElement | null): void {
  const s = video?.srcObject as MediaStream | null
  s?.getTracks().forEach((t) => t.stop())
  if (video) video.srcObject = null
}

export function grabFrame(video: HTMLVideoElement, maxPx = 2000): HTMLCanvasElement {
  const vw = video.videoWidth || 1280
  const vh = video.videoHeight || 720
  const scale = Math.min(1, maxPx / Math.max(vw, vh))
  const c = document.createElement('canvas')
  c.width = Math.round(vw * scale)
  c.height = Math.round(vh * scale)
  c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height)
  return c
}

export function canvasToDataUrl(c: HTMLCanvasElement, quality = 0.95): string {
  return c.toDataURL('image/jpeg', quality)
}

// Mejora opcional para OCR: escala de grises + contraste suave.
export function prepForOcr(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext('2d')!
  const img = ctx.getImageData(0, 0, src.width, src.height)
  const d = img.data
  let lo = 255
  let hi = 0
  for (let p = 0; p < d.length; p += 4) {
    const g = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]
    if (g < lo) lo = g
    if (g > hi) hi = g
  }
  const range = Math.max(1, hi - lo)
  const s = 255 / range
  for (let p = 0; p < d.length; p += 4) {
    const g = ((0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2] - lo) * s)
    d[p] = d[p + 1] = d[p + 2] = g < 0 ? 0 : g > 255 ? 255 : g
  }
  ctx.putImageData(img, 0, 0)
  return src
}

export async function readOcr(
  image: File | HTMLCanvasElement,
  lang: string,
  onProgress: (stage: string, pct: number) => void
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  onProgress('Cargando el motor OCR…', 5)
  const worker = await createWorker(lang, 1, {
    logger: (m: any) => {
      if (m.status === 'loading tesseract core') onProgress('Cargando el motor OCR…', 8)
      else if (m.status === 'loading language traineddata') onProgress('Descargando el modelo del idioma…', 15)
      else if (m.status === 'initializing api') onProgress('Preparando el reconocedor…', 30)
      else if (m.status === 'recognizing text') onProgress('Reconociendo texto…', Math.max(35, Math.round(m.progress * 100)))
    },
  })
  try {
    onProgress('Reconociendo texto…', 35)
    const { data } = await worker.recognize(image as any)
    onProgress('Listo', 100)
    return (data?.text || '').replace(/\n{3,}/g, '\n\n').trim()
  } finally {
    await worker.terminate()
  }
}
