'use client'

// Vortex Lens - Extraccion de texto de imagenes con OCR (Tesseract.js).
// Sube una imagen o captura con la camara: el texto aparece en un area
// editable para copiar, descargar o enviar a Vortex Notes. 100% local.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ScanText,
  Upload,
  Camera,
  CameraOff,
  SwitchCamera,
  Wand2,
  Copy,
  Check,
  FileDown,
  NotebookPen,
  Trash2,
  Loader2,
  AlertTriangle,
  Languages,
} from 'lucide-react'
import {
  OCR_LANGS,
  readOcr,
  openCamera,
  closeCamera,
  grabFrame,
  canvasToDataUrl,
  prepForOcr,
  countWords,
  lensFileName,
  downloadText,
  notesImportUrl,
} from '@/lib/lens'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#06b6d4" strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="#22d3ee" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Lens · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#22d3ee] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

export default function LensApp() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageCanvas, setImageCanvas] = useState<HTMLCanvasElement | null>(null)
  const [text, setText] = useState('')
  const [lang, setLang] = useState('spa')
  const [enhance, setEnhance] = useState(false)
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState('')
  const [pct, setPct] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [camOn, setCamOn] = useState(false)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => closeCamera(videoRef.current), [])

  const startCam = useCallback(async (f: 'environment' | 'user') => {
    setError(null)
    try {
      closeCamera(videoRef.current)
      await openCamera(videoRef.current!, f)
      setCamOn(true)
      setFacing(f)
    } catch {
      setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      setCamOn(false)
    }
  }, [])

  const stopCam = useCallback(() => {
    closeCamera(videoRef.current)
    setCamOn(false)
  }, [])

  const setFromCanvas = useCallback((c: HTMLCanvasElement, enhanced = false) => {
    const use = enhanced ? prepForOcr(c) : c
    setImageCanvas(use)
    setImageUrl(canvasToDataUrl(use))
  }, [])

  const capture = useCallback(() => {
    if (!videoRef.current?.videoWidth) return
    const c = grabFrame(videoRef.current)
    setFromCanvas(c, enhance)
    setCamOn(false)
    closeCamera(videoRef.current)
  }, [enhance, setFromCanvas])

  const importFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setError(null)
      try {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(1, 2200 / Math.max(img.width, img.height))
          const c = document.createElement('canvas')
          c.width = Math.round(img.width * scale)
          c.height = Math.round(img.height * scale)
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
          URL.revokeObjectURL(url)
          setFromCanvas(c, enhance)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          setError('Archivo de imagen no válido.')
        }
        img.src = url
      } catch {
        setError('No se pudo leer el archivo.')
      }
    },
    [enhance, setFromCanvas]
  )

  const runOcr = useCallback(async () => {
    if (!imageCanvas || running) return
    setError(null)
    setRunning(true)
    setText('')
    try {
      const source = enhance ? prepForOcr(imageCanvas) : imageCanvas
      const out = await readOcr(source, lang, (s, p) => {
        setStage(s)
        setPct(p)
      })
      if (out) setText(out)
      else setError('No se detectó texto legible en la imagen. Prueba con una foto más nítida o con contraste.')
    } catch (e: any) {
      setError('Fallo el OCR: ' + (e?.message || 'error desconocido') + '. Si es la primera vez, verifica tu conexión (se descarga el modelo del idioma).')
    } finally {
      setRunning(false)
      setStage('')
      setPct(0)
    }
  }, [imageCanvas, running, lang, enhance])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('No se pudo copiar al portapapeles.')
    }
  }

  const sendToNotes = () => {
    if (!text.trim()) return
    window.open(notesImportUrl('Texto de Vórtex Lens', text, 'ocr'), '_blank', 'noopener,noreferrer')
    setSent(true)
    window.setTimeout(() => setSent(false), 2500)
  }

  const words = countWords(text)

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0f0f10] text-[#ececf1]">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-4 sm:px-6 h-12 flex items-center gap-2.5 shrink-0">
        <VortexLogo className="w-6 h-6" />
        <span className="text-sm font-semibold tracking-wide">
          <span className="text-[#22d3ee]">Vórtex</span> Lens
        </span>
        <span className="text-[11px] text-[#9b9ba4] hidden sm:inline">· OCR: texto dentro de tus imágenes</span>
        <span className="ml-auto text-[11px] text-[#9b9ba4] hidden md:inline">Gratis · Sin anuncios · 100% local</span>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* origen de la imagen */}
        <section
          className={
            'rounded-xl border-2 border-dashed p-6 flex flex-col items-center gap-3 text-center transition-colors ' +
            (dragOver ? 'border-[#06b6d4] bg-[#06b6d4]/10' : 'border-[#2b2b31] bg-[#17171a]')
          }
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            importFile(e.dataTransfer.files?.[0])
          }}
        >
          <ScanText className="w-8 h-8 text-[#22d3ee] opacity-70" aria-hidden />
          <p className="text-sm text-[#9b9ba4]">Arrastra una imagen, elige un archivo o toma una foto con la cámara</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#06b6d4] px-4 py-2 text-xs font-semibold text-[#082026] hover:bg-[#22d3ee] transition-colors" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" aria-hidden /> Subir imagen
            </button>
            {!camOn ? (
              <button className={btn} onClick={() => startCam(facing)}>
                <Camera className="w-4 h-4" aria-hidden /> Usar cámara
              </button>
            ) : (
              <>
                <button className={btnPrimaryCls()} onClick={capture}>
                  <Camera className="w-4 h-4" aria-hidden /> Capturar foto
                </button>
                <button
                  className={btn}
                  onClick={() => startCam(facing === 'environment' ? 'user' : 'environment')}
                >
                  <SwitchCamera className="w-4 h-4" aria-hidden /> Cambiar cámara
                </button>
                <button className={btn} onClick={stopCam}>
                  <CameraOff className="w-4 h-4" aria-hidden /> Cerrar
                </button>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                importFile(e.target.files?.[0])
                e.currentTarget.value = ''
              }}
            />
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {error}
          </div>
        )}

        {/* camara */}
        {camOn && (
          <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-3">
            <div className="rounded-lg overflow-hidden border border-[#2b2b31] bg-black">
              <video ref={videoRef} playsInline muted className="w-full max-h-[380px] object-contain" />
            </div>
            <p className="text-[11px] text-[#9b9ba4]">Encuadra el texto a leer, mantén la cámara estable y captura.</p>
          </section>
        )}

        {/* imagen + ajustes OCR */}
        {imageUrl && (
          <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Imagen a analizar" className="w-full max-h-[360px] object-contain rounded-lg border border-[#2b2b31]" />
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-[#9b9ba4]">
                <Languages className="w-3.5 h-3.5" aria-hidden /> Idioma:
                <select
                  className="rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-2.5 py-1.5 text-xs text-[#ececf1] disabled:opacity-50"
                  value={lang}
                  disabled={running}
                  onChange={(e) => setLang(e.target.value)}
                >
                  {OCR_LANGS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[#9b9ba4] cursor-pointer">
                <input type="checkbox" className="accent-[#06b6d4]" checked={enhance} disabled={running} onChange={(e) => setEnhance(e.target.checked)} />
                Mejorar contraste para OCR
              </label>
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#06b6d4] px-3.5 py-2 text-xs font-semibold text-[#082026] hover:bg-[#22d3ee] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={runOcr}
                disabled={running}
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Wand2 className="w-4 h-4" aria-hidden />}
                {running ? 'Reconociendo…' : 'Extraer texto'}
              </button>
              <button
                className={btn}
                onClick={() => {
                  setImageUrl(null)
                  setImageCanvas(null)
                  setText('')
                  setError(null)
                }}
                disabled={running}
              >
                <Trash2 className="w-4 h-4" aria-hidden /> Quitar imagen
              </button>
            </div>
            {running && (
              <div className="flex flex-col gap-1.5">
                <div className="h-2 rounded-full bg-[#1e1e22] overflow-hidden">
                  <div className="h-full bg-[#06b6d4] transition-all" style={{ width: pct + '%' }} />
                </div>
                <p className="text-[11px] text-[#9b9ba4]">{stage}</p>
                <p className="text-[10px] text-[#6b6b74]">
                  La primera vez se descarga el modelo del idioma (5–15 MB); después queda guardado en tu navegador.
                </p>
              </div>
            )}
          </section>
        )}

        {/* texto extraido */}
        {(text || !running) && imageUrl && (
          <section className="rounded-xl border border-[#2b2b31] bg-[#17171a] p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-[#9b9ba4] uppercase tracking-wider">
              Texto extraído · {words} palabras · editable
            </h2>
            <textarea
              className="w-full min-h-[220px] rounded-lg border border-[#2b2b31] bg-[#121214] p-4 text-[15px] leading-relaxed text-[#ececf1] outline-none focus:border-[#06b6d4] resize-y"
              placeholder="El texto reconocido aparecerá aquí y podrás editarlo antes de copiarlo o enviarlo…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={copy} disabled={!text.trim()}>
                <Copy className="w-4 h-4" aria-hidden /> {copied ? 'Copiado' : 'Copiar al portapapeles'}
              </button>
              <button className={btn} onClick={() => downloadText(lensFileName(), text)} disabled={!text.trim()}>
                <FileDown className="w-4 h-4" aria-hidden /> Descargar .txt
              </button>
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#06b6d4] px-3.5 py-2 text-xs font-semibold text-[#082026] hover:bg-[#22d3ee] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={sendToNotes}
                disabled={!text.trim()}
              >
                <NotebookPen className="w-4 h-4" aria-hidden /> Enviar a Vórtex Notes
              </button>
            </div>
            {sent && (
              <p className="text-xs text-[#22d3ee]">
                Abierto Vórtex Notes en una pestaña nueva: el texto llega como nota nueva lista para guardar.
              </p>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

function btnPrimaryCls(): string {
  return 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#06b6d4] px-3.5 py-2 text-xs font-semibold text-[#082026] hover:bg-[#22d3ee] transition-colors'
}
