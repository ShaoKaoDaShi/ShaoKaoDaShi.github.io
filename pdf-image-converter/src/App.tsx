import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { PDFDocument, rgb } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { Loader2, Image as ImageIcon, FileImage, FileText, SunMedium, MoonStar, Trash2, Download, Settings2, Info, HelpCircle, GripVertical, TimerReset, AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import './App.css'

// Configure pdf.js worker (Vite / ESM friendly)
// @ts-ignore - worker is bundled by Vite
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

// ---------- Types ----------

type OutputImageFormat = 'png' | 'jpeg' | 'webp'

type PdfJobStatus = 'idle' | 'processing' | 'done' | 'error' | 'canceled'

type PdfPageImage = {
  pageIndex: number
  blob: Blob
  url: string
}

type PdfJob = {
  id: string
  file: File
  status: PdfJobStatus
  error?: string
  pagesTotal: number
  pagesDone: number
  images: PdfPageImage[]
  startedAt?: number
  etaMs?: number
}

type FitMode = 'contain' | 'cover' | 'stretch'

type PagePreset = 'A4' | 'Letter' | 'Custom'

type Unit = 'mm' | 'px'

type ImageItem = {
  id: string
  file: File
  url: string
  width?: number
  height?: number
}

// ---------- Helpers ----------

const mmToPt = (mm: number) => (mm * 72) / 25.4

const presets: Record<PagePreset, { width: number; height: number; unit: Unit }> = {
  A4: { width: 210, height: 297, unit: 'mm' },
  Letter: { width: 216, height: 279, unit: 'mm' },
  Custom: { width: 210, height: 297, unit: 'mm' },
}

function parsePageRange(input: string, totalPages: number): number[] | null {
  if (!input.trim()) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  const pages = new Set<number>()

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const n = Number(part)
      if (n >= 1 && n <= totalPages) pages.add(n)
      else return null
    } else if (/^(\d+)-(\d+)$/.test(part)) {
      const [, startStr, endStr] = part.match(/(\d+)-(\d+)/) || []
      const start = Number(startStr)
      const end = Number(endStr)
      if (!start || !end || start > end) return null
      if (start < 1 || end > totalPages) return null
      for (let p = start; p <= end; p++) pages.add(p)
    } else {
      return null
    }
  }

  return Array.from(pages).sort((a, b) => a - b)
}

function getBaseName(file: File) {
  const idx = file.name.lastIndexOf('.')
  return idx === -1 ? file.name : file.name.slice(0, idx)
}

function formatEta(ms?: number) {
  if (!ms || ms <= 0) return '预估剩余时间：--'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `预估剩余时间：约 ${sec} 秒`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `预估剩余时间：约 ${m} 分 ${s} 秒`
}

function createId() {
  return Math.random().toString(36).slice(2)
}

// ---------- PDF → Image Hook ----------

function usePdfToImage() {
  const [jobs, setJobs] = useState<PdfJob[]>([])
  const [outputFormat, setOutputFormat] = useState<OutputImageFormat>('png')
  const [scale, setScale] = useState(1.5)
  const [jpegQuality, setJpegQuality] = useState(0.9)
  const [webpQuality, setWebpQuality] = useState(0.9)
  const [pageRangeInput, setPageRangeInput] = useState('')
  const [pageRangeError, setPageRangeError] = useState<string | null>(null)
  const [transparentPng, setTransparentPng] = useState(false)
  const cancelRef = useRef<{ [id: string]: boolean }>({})

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter((f) => f.type === 'application/pdf')
    const rejected = acceptedFiles.filter((f) => f.type !== 'application/pdf')

    if (rejected.length) {
      alert('以下文件不是 PDF，已忽略：\n' + rejected.map((f) => f.name).join('\n'))
    }

    if (!pdfFiles.length) return

    setJobs((prev) => [
      ...prev,
      ...pdfFiles.map((file) => ({
        id: createId(),
        file,
        status: 'idle' as PdfJobStatus,
        pagesTotal: 0,
        pagesDone: 0,
        images: [],
      })),
    ])
  }, [])

  const startJob = useCallback(
    async (job: PdfJob) => {
      const startedAt = Date.now()
      cancelRef.current[job.id] = false

      try {
        const data = await job.file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data })
        const pdf = await loadingTask.promise
        const totalPages = pdf.numPages

        let pages = parsePageRange(pageRangeInput, totalPages)
        if (!pages) {
          setPageRangeError('页码范围格式错误，已自动恢复为全部页面。示例：1-3,5')
          pages = Array.from({ length: totalPages }, (_, i) => i + 1)
        } else {
          setPageRangeError(null)
        }

        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'processing',
                  pagesTotal: pages!.length,
                  pagesDone: 0,
                  images: [],
                  startedAt,
                  etaMs: undefined,
                }
              : j,
          ),
        )

        const images: PdfPageImage[] = []
        let processed = 0

        for (const pageNum of pages) {
          if (cancelRef.current[job.id]) {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id ? { ...j, status: 'canceled', etaMs: 0 } : j,
              ),
            )
            return
          }

          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) throw new Error('无法创建 Canvas 上下文')

          canvas.width = viewport.width
          canvas.height = viewport.height

          if (outputFormat === 'png' && transparentPng) {
            context.clearRect(0, 0, canvas.width, canvas.height)
          } else {
            context.fillStyle = '#ffffff'
            context.fillRect(0, 0, canvas.width, canvas.height)
          }

          await page.render({ canvasContext: context, viewport, canvas }).promise

          const quality = outputFormat === 'jpeg' ? jpegQuality : webpQuality
          const mimeType =
            outputFormat === 'png'
              ? 'image/png'
              : outputFormat === 'jpeg'
              ? 'image/jpeg'
              : 'image/webp'

          const blob: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
              (b) => {
                if (b) resolve(b)
                else reject(new Error('导出图片失败'))
              },
              mimeType,
              quality,
            )
          })

          const url = URL.createObjectURL(blob)
          images.push({ pageIndex: pageNum, blob, url })

          processed += 1
          const elapsed = Date.now() - startedAt
          const avgPerPage = elapsed / processed
          const remaining = pages.length - processed
          const etaMs = remaining * avgPerPage

          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    pagesDone: processed,
                    images: [...images],
                    etaMs,
                  }
                : j,
            ),
          )
        }

        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: 'done', etaMs: 0 } : j,
          ),
        )
      } catch (e) {
        console.error(e)
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'error',
                  error:
                    e instanceof Error
                      ? e.message
                      : '解析或渲染 PDF 时出错，请尝试更小的文件或降低分辨率。',
                }
              : j,
          ),
        )
      }
    },
    [jpegQuality, outputFormat, pageRangeInput, scale, transparentPng, webpQuality],
  )

  const startAll = useCallback(() => {
    const idle = jobs.filter((j) => j.status === 'idle' || j.status === 'error')
    idle.forEach((job) => {
      startJob(job)
    })
  }, [jobs, startJob])

  const cancelJob = useCallback((id: string) => {
    cancelRef.current[id] = true
  }, [])

  const clearJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    Object.keys(cancelRef.current).forEach((id) => {
      cancelRef.current[id] = true
    })
    setJobs([])
  }, [])

  const downloadSingleImage = useCallback(
    (job: PdfJob, img: PdfPageImage) => {
      const base = getBaseName(job.file)
      saveAs(img.blob, `${base}_page_${img.pageIndex}.${outputFormat}`)
    },
    [outputFormat],
  )

  const downloadZip = useCallback(async (job: PdfJob) => {
    if (!job.images.length) return
    const zip = new JSZip()
    const base = getBaseName(job.file)
    job.images.forEach((img) => {
      const ext = outputFormat
      zip.file(`${base}_page_${img.pageIndex}.${ext}`, img.blob)
    })
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${base}_pages_${job.images.length}.zip`)
  }, [outputFormat])

  return {
    jobs,
    outputFormat,
    setOutputFormat,
    scale,
    setScale,
    jpegQuality,
    setJpegQuality,
    webpQuality,
    setWebpQuality,
    pageRangeInput,
    setPageRangeInput,
    pageRangeError,
    transparentPng,
    setTransparentPng,
    onDrop,
    startAll,
    startJob,
    cancelJob,
    clearJob,
    clearAll,
    downloadSingleImage,
    downloadZip,
  }
}

// ---------- Image → PDF Hook ----------

function useImagesToPdf() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [pagePreset, setPagePreset] = useState<PagePreset>('A4')
  const [unit, setUnit] = useState<Unit>('mm')
  const [customWidth, setCustomWidth] = useState(210)
  const [customHeight, setCustomHeight] = useState(297)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [margin, setMargin] = useState(10)
  const [fitMode, setFitMode] = useState<FitMode>('contain')
  const [background, setBackground] = useState('#ffffff')
  const [jpegQuality, setJpegQuality] = useState(0.9)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [etaMs, setEtaMs] = useState<number | undefined>(undefined)
  const cancelRef = useRef(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const unsupported: string[] = []
    const next: ImageItem[] = []

    acceptedFiles.forEach((file) => {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        if (file.type === 'image/heic' || file.type === 'image/heif') {
          unsupported.push(`${file.name}（HEIC/HEIF 暂不支持，建议先导出为 JPG/PNG）`)
        } else {
          unsupported.push(`${file.name}（不支持的图片格式）`)
        }
        return
      }

      const url = URL.createObjectURL(file)
      const id = createId()
      const item: ImageItem = { id, file, url }

      // 预读尺寸
      const img = new Image()
      img.onload = () => {
        setImages((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, width: img.width, height: img.height } : it,
          ),
        )
      }
      img.src = url

      next.push(item)
    })

    setImages((prev) => [...prev, ...next])

    if (unsupported.length) {
      alert('以下文件未被接收：\n' + unsupported.join('\n'))
    }
  }, [])

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, moved)
      return arr
    })
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setImages([])
    setStatus('idle')
    setError(null)
    setProgress(0)
    setEtaMs(undefined)
  }, [])

  const pageSize = useMemo(() => {
    const preset = presets[pagePreset]
    const baseUnit = unit
    let w = preset.width
    let h = preset.height

    if (pagePreset === 'Custom') {
      w = customWidth
      h = customHeight
    }

    if (orientation === 'landscape') {
      ;[w, h] = [h, w]
    }

    const toPt = baseUnit === 'mm' ? mmToPt : (v: number) => v

    return {
      widthPt: toPt(w),
      heightPt: toPt(h),
    }
  }, [customHeight, customWidth, orientation, pagePreset, unit])

  const generatePdf = useCallback(async () => {
    if (!images.length) {
      alert('请先添加至少一张图片')
      return
    }

    cancelRef.current = false
    setStatus('processing')
    setError(null)
    setProgress(0)
    setEtaMs(undefined)

    try {
      const doc = await PDFDocument.create()
      if (title.trim()) doc.setTitle(title.trim())
      if (author.trim()) doc.setAuthor(author.trim())

      const { widthPt, heightPt } = pageSize
      const marginPt = unit === 'mm' ? mmToPt(margin) : margin

      const startedAt = Date.now()
      let processed = 0

      for (const item of images) {
        if (cancelRef.current) {
          setStatus('idle')
          return
        }

        // 统一转为 JPEG 以控制质量，同时兼容 WebP
        const bitmap = await createImageBitmap(item.file)
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法创建 Canvas 上下文')

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(bitmap, 0, 0)

        const blob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b)
              else reject(new Error('图片压缩失败'))
            },
            'image/jpeg',
            jpegQuality,
          )
        })

        const arrayBuffer = await blob.arrayBuffer()
        const img = await doc.embedJpg(arrayBuffer)

        const page = doc.addPage([widthPt, heightPt])
        const bgColor = hexToRgb(background)
        if (bgColor) {
          page.drawRectangle({
            x: 0,
            y: 0,
            width: widthPt,
            height: heightPt,
            color: rgb(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255),
          })
        }

        const maxWidth = widthPt - marginPt * 2
        const maxHeight = heightPt - marginPt * 2

        const imgWidth = img.width
        const imgHeight = img.height

        let drawWidth = maxWidth
        let drawHeight = maxHeight

        const imgAspect = imgWidth / imgHeight
        const pageAspect = maxWidth / maxHeight

        if (fitMode === 'contain') {
          if (imgAspect > pageAspect) {
            drawWidth = maxWidth
            drawHeight = maxWidth / imgAspect
          } else {
            drawHeight = maxHeight
            drawWidth = maxHeight * imgAspect
          }
        } else if (fitMode === 'cover') {
          if (imgAspect > pageAspect) {
            drawHeight = maxHeight
            drawWidth = maxHeight * imgAspect
          } else {
            drawWidth = maxWidth
            drawHeight = maxWidth / imgAspect
          }
        } else if (fitMode === 'stretch') {
          drawWidth = maxWidth
          drawHeight = maxHeight
        }

        const x = marginPt + (maxWidth - drawWidth) / 2
        const y = marginPt + (maxHeight - drawHeight) / 2

        page.drawImage(img, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        })

        processed += 1
        const elapsed = Date.now() - startedAt
        const avgPer = elapsed / processed
        const remaining = images.length - processed
        const eta = remaining * avgPer

        setProgress(Math.round((processed / images.length) * 100))
        setEtaMs(eta)
      }

      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const firstName = images[0]?.file?.name
      const base = firstName ? getBaseName(images[0].file) : 'images-to-pdf'
      const ts = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\..+/, '')

      saveAs(blob, `${base}_${ts}.pdf`)

      setStatus('done')
      setEtaMs(0)
    } catch (e) {
      console.error(e)
      setStatus('error')
      setError(
        e instanceof Error
          ? e.message
          : '生成 PDF 时发生错误，请尝试减少图片数量或降低质量。',
      )
    }
  }, [author, background, images, jpegQuality, margin, pageSize, title, unit, fitMode])

  const cancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  return {
    images,
    pagePreset,
    setPagePreset,
    unit,
    setUnit,
    customWidth,
    setCustomWidth,
    customHeight,
    setCustomHeight,
    orientation,
    setOrientation,
    margin,
    setMargin,
    fitMode,
    setFitMode,
    background,
    setBackground,
    jpegQuality,
    setJpegQuality,
    title,
    setTitle,
    author,
    setAuthor,
    status,
    error,
    progress,
    etaMs,
    onDrop,
    moveImage,
    removeImage,
    clearAll,
    generatePdf,
    cancel,
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (h.length !== 6) return null
  const num = parseInt(h, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

// ---------- Drag & Drop item component ----------

type DraggableItemProps = {
  item: ImageItem
  index: number
  onMove: (from: number, to: number) => void
  onRemove: (id: string) => void
}

function DraggableImageItem({ item, index, onMove, onRemove }: DraggableItemProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const fromIndex = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(fromIndex) && fromIndex !== index) {
      onMove(fromIndex, index)
    }
  }

  return (
    <div
      ref={ref}
      className='group flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 bg-white/60 p-2 text-xs shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60'
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className='flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800'>
        <img
          src={item.url}
          alt={item.file.name}
          className='h-full w-full object-cover'
          loading='lazy'
        />
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <div className='flex items-center gap-2'>
          <GripVertical className='h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300' />
          <span className='truncate font-medium'>{item.file.name}</span>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400'>
          {item.width && item.height && (
            <span>
              {item.width} × {item.height}
            </span>
          )}
          <span>{(item.file.size / 1024).toFixed(1)} KB</span>
        </div>
      </div>
      <Button
        variant='ghost'
        size='icon'
        className='text-zinc-400 hover:text-red-500'
        type='button'
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  )
}

// ---------- Main App ----------

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = window.localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const {
    jobs,
    outputFormat,
    setOutputFormat,
    scale,
    setScale,
    jpegQuality,
    setJpegQuality,
    webpQuality,
    setWebpQuality,
    pageRangeInput,
    setPageRangeInput,
    pageRangeError,
    transparentPng,
    setTransparentPng,
    onDrop: onPdfDrop,
    startAll,
    cancelJob,
    clearJob,
    clearAll,
    downloadSingleImage,
    downloadZip,
  } = usePdfToImage()

  const {
    images,
    pagePreset,
    setPagePreset,
    unit,
    setUnit,
    customWidth,
    setCustomWidth,
    customHeight,
    setCustomHeight,
    orientation,
    setOrientation,
    margin,
    setMargin,
    fitMode,
    setFitMode,
    background,
    setBackground,
    jpegQuality: imgJpegQuality,
    setJpegQuality: setImgJpegQuality,
    title,
    setTitle,
    author,
    setAuthor,
    status: imgStatus,
    error: imgError,
    progress: imgProgress,
    etaMs: imgEta,
    onDrop: onImageDrop,
    moveImage,
    removeImage,
    clearAll: clearAllImages,
    generatePdf,
    cancel: cancelImagePdf,
  } = useImagesToPdf()

  const pdfDropzone = useDropzone({
    onDrop: onPdfDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  const imageDropzone = useDropzone({
    onDrop: onImageDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    multiple: true,
  })

  return (
    <div className='min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-50'>
      <header className='border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80'>
        <div className='mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/30'>
              <FileImage className='h-5 w-5' />
            </div>
            <div className='flex flex-col'>
              <span className='text-base font-semibold tracking-tight sm:text-lg'>图片 ↔ PDF 本地转换工具</span>
              <span className='text-xs text-zinc-500 dark:text-zinc-400'>全部在浏览器中完成 · 不上传任何文件</span>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='icon'
              className='rounded-full border border-zinc-200 bg-white/70 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/70 dark:hover:bg-zinc-800'
              type='button'
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <MoonStar className='h-4 w-4' />
              ) : (
                <SunMedium className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className='mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10'>
        {/* Hero 区 */}
        <section className='grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center'>
          <div className='space-y-5'>
            <div className='inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs text-sky-700 shadow-sm dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200'>
              <CheckCircle2 className='h-3.5 w-3.5' />
              <span>隐私优先 · 所有处理仅在本地浏览器进行</span>
            </div>
            <h1 className='text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl'>
              一站式图片与 PDF 相互转换
            </h1>
            <p className='max-w-xl text-sm text-zinc-600 dark:text-zinc-300 sm:text-base'>
              将多页 PDF 快速拆分为高质量图片，或把多张图片整理为版式精美的 PDF 文档。拖拽上传、实时预览、下载 ZIP，一切都在你的浏览器中完成。
            </p>
            <div className='flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-300'>
              <div className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-700'>
                <ImageIcon className='h-3.5 w-3.5 text-sky-500' />
                <span>支持 PNG / JPG / WebP</span>
              </div>
              <div className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-700'>
                <FileText className='h-3.5 w-3.5 text-indigo-500' />
                <span>多页 PDF 分页导出</span>
              </div>
              <div className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-700'>
                <Settings2 className='h-3.5 w-3.5 text-emerald-500' />
                <span>分辨率 / 质量 / 版式全可控</span>
              </div>
            </div>
          </div>
          <div className='relative'>
            <div className='absolute inset-0 -z-10 bg-gradient-to-tr from-sky-100 via-indigo-50 to-emerald-50 opacity-80 blur-3xl dark:from-sky-900/40 dark:via-zinc-900 dark:to-emerald-900/30' />
            <div className='overflow-hidden rounded-2xl border border-zinc-100 bg-white/80 shadow-xl shadow-sky-100/60 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-zinc-950/60'>
              <div className='flex items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
                <div className='flex items-center gap-1.5'>
                  <span className='h-2 w-2 rounded-full bg-red-400' />
                  <span className='h-2 w-2 rounded-full bg-amber-400' />
                  <span className='h-2 w-2 rounded-full bg-emerald-400' />
                </div>
                <span>浏览器本地处理 · 零上传</span>
              </div>
              <div className='p-4'>
                <img
                  src='https://p3-search.byteimg.com/obj/labis/39cdc5adee0910de8740c7d46b8e1e8a'
                  alt='前端工具插画：展示界面设计与操作的现代扁平风场景'
                  className='h-52 w-full rounded-xl object-cover sm:h-60'
                  loading='lazy'
                />
              </div>
            </div>
          </div>
        </section>

        {/* 功能 Tabs */}
        <section className='space-y-4'>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl'>
              <Settings2 className='h-5 w-5 text-sky-500' />
              转换工具
            </h2>
            <p className='hidden text-xs text-zinc-500 sm:block dark:text-zinc-400'>
              支持批量处理与进度展示，适合日常办公与文档归档场景。
            </p>
          </div>
          <Card className='border-zinc-200/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900'>
            <CardHeader className='border-b border-zinc-100 pb-2 dark:border-zinc-800'>
              <Tabs defaultValue='pdf-to-image' className='w-full'>
                <div className='flex flex-col justify-between gap-3 md:flex-row md:items-center'>
                  <TabsList className='bg-zinc-100/80 dark:bg-zinc-800/80'>
                    <TabsTrigger value='pdf-to-image' className='flex items-center gap-1 text-xs sm:text-sm'>
                      <FileText className='h-4 w-4' /> PDF 转图片
                    </TabsTrigger>
                    <TabsTrigger value='image-to-pdf' className='flex items-center gap-1 text-xs sm:text-sm'>
                      <ImageIcon className='h-4 w-4' /> 图片合并为 PDF
                    </TabsTrigger>
                  </TabsList>
                  <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                    小提示：拖拽文件到区域中即可快速开始。
                  </p>
                </div>

                <TabsContent value='pdf-to-image' className='pt-4'>
                  <PdfToImagePanel
                    dropzone={pdfDropzone}
                    jobs={jobs}
                    outputFormat={outputFormat}
                    setOutputFormat={setOutputFormat}
                    scale={scale}
                    setScale={setScale}
                    jpegQuality={jpegQuality}
                    setJpegQuality={setJpegQuality}
                    webpQuality={webpQuality}
                    setWebpQuality={setWebpQuality}
                    pageRangeInput={pageRangeInput}
                    setPageRangeInput={setPageRangeInput}
                    pageRangeError={pageRangeError}
                    transparentPng={transparentPng}
                    setTransparentPng={setTransparentPng}
                    startAll={startAll}
                    cancelJob={cancelJob}
                    clearJob={clearJob}
                    clearAll={clearAll}
                    downloadSingleImage={downloadSingleImage}
                    downloadZip={downloadZip}
                  />
                </TabsContent>

                <TabsContent value='image-to-pdf' className='pt-4'>
                  <ImagesToPdfPanel
                    dropzone={imageDropzone}
                    images={images}
                    pagePreset={pagePreset}
                    setPagePreset={setPagePreset}
                    unit={unit}
                    setUnit={setUnit}
                    customWidth={customWidth}
                    setCustomWidth={setCustomWidth}
                    customHeight={customHeight}
                    setCustomHeight={setCustomHeight}
                    orientation={orientation}
                    setOrientation={setOrientation}
                    margin={margin}
                    setMargin={setMargin}
                    fitMode={fitMode}
                    setFitMode={setFitMode}
                    background={background}
                    setBackground={setBackground}
                    jpegQuality={imgJpegQuality}
                    setJpegQuality={setImgJpegQuality}
                    title={title}
                    setTitle={setTitle}
                    author={author}
                    setAuthor={setAuthor}
                    status={imgStatus}
                    error={imgError}
                    progress={imgProgress}
                    etaMs={imgEta}
                    moveImage={moveImage}
                    removeImage={removeImage}
                    clearAllImages={clearAllImages}
                    generatePdf={generatePdf}
                    cancel={cancelImagePdf}
                  />
                </TabsContent>
              </Tabs>
            </CardHeader>
            <CardContent className='hidden border-t border-dashed border-zinc-200 bg-zinc-50/80 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 sm:block'>
              <div className='flex flex-wrap items-center gap-3'>
                <div className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-700'>
                  <TimerReset className='h-3.5 w-3.5' />
                  <span>进度与预估剩余时间实时刷新</span>
                </div>
                <div className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:ring-zinc-700'>
                  <AlertTriangle className='h-3.5 w-3.5' />
                  <span>遇到大文件时建议降低分辨率或分批处理</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ 区 */}
        <section className='space-y-4'>
          <div className='flex items-center gap-2'>
            <HelpCircle className='h-5 w-5 text-sky-500' />
            <h2 className='text-lg font-semibold tracking-tight sm:text-xl'>常见问题</h2>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <FaqItem
              question='如何提高导出图片或生成 PDF 的清晰度？'
              answer='你可以在“PDF 转图片”中提高缩放比例，或在“图片合并为 PDF”中上传原图并适当提高 JPEG 质量。请注意：分辨率和质量越高，处理时间和文件体积也会随之增大。'
            />
            <FaqItem
              question='多页 PDF 只想导出其中几页怎么办？'
              answer='在“PDF 转图片”区域中，使用页码范围输入框，例如 1-3,5 表示导出第 1 至 3 页以及第 5 页。输入非法范围时，会自动回退为全部页面。'
            />
            <FaqItem
              question='ZIP 下载后在哪里可以找到？'
              answer='点击“全部打包下载 ZIP”后，浏览器会在默认的下载目录中保存一个压缩包文件。你可以在下载管理器或“下载”文件夹中找到它。'
            />
            <FaqItem
              question='为什么处理速度有时会比较慢？'
              answer='浏览器在本地完成所有解码与渲染，大体积的 PDF 或超高分辨率图片会增加处理时间。建议：适当降低缩放比例 / JPEG 质量，或分批处理文件。必要时关闭其他占用资源较多的网页标签。'
            />
            <FaqItem
              question='我的 HEIC 照片无法添加？'
              answer='当前版本尚不支持直接处理 HEIC/HEIF 等格式。建议先在系统相册中导出为 JPG 或 PNG，然后再拖拽到本工具中进行合并。'
            />
            <FaqItem
              question='隐私上是否安全，会不会把文件上传到服务器？'
              answer='所有解析与转换都在你当前的浏览器进程中完成，仅使用本地计算资源，不会上传到任何远程服务器。你可以在网络面板中观察请求情况进行验证。'
            />
          </div>
        </section>
      </main>

      <footer className='border-t border-zinc-200 bg-white/80 py-4 text-xs text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400'>
        <div className='mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 sm:flex-row sm:items-center sm:px-6'>
          <p>本工具适合日常办公整理、资料归档、作业打印前预处理等场景使用。</p>
          <p className='text-[11px]'>提示：大型文件处理较慢属正常现象，请耐心等待或调整参数后重试。</p>
        </div>
      </footer>
    </div>
  )
}

// ---------- Panels ----------

type PdfToImagePanelProps = {
  dropzone: ReturnType<typeof useDropzone>
  jobs: PdfJob[]
  outputFormat: OutputImageFormat
  setOutputFormat: (v: OutputImageFormat) => void
  scale: number
  setScale: (v: number) => void
  jpegQuality: number
  setJpegQuality: (v: number) => void
  webpQuality: number
  setWebpQuality: (v: number) => void
  pageRangeInput: string
  setPageRangeInput: (v: string) => void
  pageRangeError: string | null
  transparentPng: boolean
  setTransparentPng: (v: boolean) => void
  startAll: () => void
  cancelJob: (id: string) => void
  clearJob: (id: string) => void
  clearAll: () => void
  downloadSingleImage: (job: PdfJob, img: PdfPageImage) => void
  downloadZip: (job: PdfJob) => void
}

function PdfToImagePanel(props: PdfToImagePanelProps) {
  const {
    dropzone,
    jobs,
    outputFormat,
    setOutputFormat,
    scale,
    setScale,
    jpegQuality,
    setJpegQuality,
    webpQuality,
    setWebpQuality,
    pageRangeInput,
    setPageRangeInput,
    pageRangeError,
    transparentPng,
    setTransparentPng,
    startAll,
    cancelJob,
    clearJob,
    clearAll,
    downloadSingleImage,
    downloadZip,
  } = props

  const { getRootProps, getInputProps, isDragActive } = dropzone

  const anyProcessing = jobs.some((j) => j.status === 'processing')

  return (
    <div className='space-y-4'>
      <div
        {...getRootProps({
          className: cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 transition hover:border-sky-400 hover:bg-sky-50/70 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-sky-500 dark:hover:bg-zinc-900',
            isDragActive && 'border-sky-500 bg-sky-50/80 dark:bg-zinc-900',
          ),
        })}
      >
        <input {...getInputProps()} />
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300'>
            <FileText className='h-5 w-5' />
          </div>
          <div className='text-left'>
            <p className='text-sm font-medium text-zinc-800 dark:text-zinc-100'>拖拽 PDF 到此处，或点击选择文件</p>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>支持多文件队列处理 · 每个页面会导出为一张图片</p>
          </div>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
        <div className='space-y-4'>
          <div className='grid gap-3 rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label className='flex items-center gap-1.5 text-xs'>
                  导出格式
                  <Info className='h-3 w-3 text-zinc-400' />
                </Label>
                <div className='flex gap-2'>
                  {(
                    [
                      { value: 'png', label: 'PNG（无损，适合留底）' },
                      { value: 'jpeg', label: 'JPEG（适合分享）' },
                      { value: 'webp', label: 'WebP（体积更小）' },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.value}
                      type='button'
                      variant={outputFormat === opt.value ? 'default' : 'outline'}
                      size='sm'
                      className='flex-1 whitespace-nowrap px-2 text-[11px]'
                      onClick={() => setOutputFormat(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='flex items-center justify-between text-xs'>
                  页面范围
                  <span className='text-[11px] font-normal text-zinc-400'>留空表示全部</span>
                </Label>
                <Input
                  placeholder='示例：1-3,5'
                  value={pageRangeInput}
                  onChange={(e) => setPageRangeInput(e.target.value)}
                  className='h-8 text-xs'
                />
                {pageRangeError && (
                  <p className='text-[11px] text-amber-600 dark:text-amber-400'>{pageRangeError}</p>
                )}
              </div>
            </div>

            <Separator className='my-1' />

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <Label>缩放（类似 DPI）</Label>
                  <span className='text-[11px] text-zinc-500'>约 ×{scale.toFixed(1)}</span>
                </div>
                <Slider
                  min={0.8}
                  max={3}
                  step={0.1}
                  value={[scale]}
                  onValueChange={([v]) => setScale(v)}
                />
              </div>

              <div className='space-y-2'>
                {outputFormat === 'jpeg' && (
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between text-xs'>
                      <Label>JPEG 质量</Label>
                      <span className='text-[11px] text-zinc-500'>{Math.round(jpegQuality * 100)}%</span>
                    </div>
                    <Slider
                      min={0.5}
                      max={1}
                      step={0.05}
                      value={[jpegQuality]}
                      onValueChange={([v]) => setJpegQuality(v)}
                    />
                  </div>
                )}
                {outputFormat === 'webp' && (
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between text-xs'>
                      <Label>WebP 质量</Label>
                      <span className='text-[11px] text-zinc-500'>{Math.round(webpQuality * 100)}%</span>
                    </div>
                    <Slider
                      min={0.5}
                      max={1}
                      step={0.05}
                      value={[webpQuality]}
                      onValueChange={([v]) => setWebpQuality(v)}
                    />
                  </div>
                )}

                {outputFormat === 'png' && (
                  <div className='flex items-center justify-between rounded-md bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-600 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700'>
                    <div className='flex items-center gap-2'>
                      <Switch
                        checked={transparentPng}
                        onCheckedChange={(v) => setTransparentPng(Boolean(v))}
                      />
                      <span className='font-medium'>尽量保留透明背景</span>
                    </div>
                    <span className='hidden md:inline'>适合贴在幻灯片或再设计场景</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              onClick={startAll}
              disabled={!jobs.length || anyProcessing}
              className='inline-flex items-center gap-1.5'
            >
              {anyProcessing ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <TimerReset className='h-4 w-4' />
              )}
              <span>{anyProcessing ? '正在处理…' : '开始处理所有 PDF'}</span>
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={!jobs.length}
              onClick={clearAll}
              className='inline-flex items-center gap-1.5'
            >
              <Trash2 className='h-4 w-4' />
              清空队列
            </Button>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>
              队列内的文件会按顺序处理，可随时取消单个任务。
            </p>
          </div>
        </div>

        <div className='space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-4'>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-medium text-zinc-800 dark:text-zinc-100'>文件队列与预览</p>
            <span className='text-[11px] text-zinc-500 dark:text-zinc-400'>共 {jobs.length} 个任务</span>
          </div>
          <Separator />
          {jobs.length === 0 ? (
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>暂未添加 PDF 文件。拖拽文件到左侧区域即可开始。</p>
          ) : (
            <div className='space-y-3 max-h-[420px] overflow-y-auto pr-1'>
              {jobs.map((job) => {
                const percent = job.pagesTotal
                  ? Math.round((job.pagesDone / job.pagesTotal) * 100)
                  : 0
                return (
                  <div
                    key={job.id}
                    className='space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2.5 shadow-xs dark:border-zinc-700 dark:bg-zinc-900/70'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-xs font-medium text-zinc-800 dark:text-zinc-100'>
                          {job.file.name}
                        </p>
                        <p className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                          {job.status === 'processing'
                            ? `正在导出页面… (${job.pagesDone}/${job.pagesTotal || '?'})`
                            : job.status === 'done'
                            ? `已完成 · 共 ${job.images.length} 张图片`
                            : job.status === 'error'
                            ? '处理失败'
                            : job.status === 'canceled'
                            ? '已取消'
                            : '待处理'}
                        </p>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        {job.status === 'processing' && (
                          <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 text-zinc-500 hover:text-amber-600'
                            onClick={() => cancelJob(job.id)}
                          >
                            <AlertTriangle className='h-4 w-4' />
                          </Button>
                        )}
                        {(job.status === 'done' || job.status === 'error' || job.status === 'canceled') && (
                          <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 text-zinc-500 hover:text-red-600'
                            onClick={() => clearJob(job.id)}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        )}
                      </div>
                    </div>

                    {job.status === 'processing' && (
                      <div className='space-y-1.5'>
                        <Progress value={percent} className='h-1.5' />
                        <div className='flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400'>
                          <span>{percent}%</span>
                          <span>{formatEta(job.etaMs)}</span>
                        </div>
                      </div>
                    )}

                    {job.error && (
                      <p className='text-[11px] text-red-500'>{job.error}</p>
                    )}

                    {job.images.length > 0 && (
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400'>
                          <span>预览（点击缩略图可单独下载）</span>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            className='h-6 gap-1 px-2 text-[11px]'
                            onClick={() => downloadZip(job)}
                          >
                            <span className='inline-flex items-center gap-1'>
                              <Download className='h-3.5 w-3.5' /> 全部打包 ZIP
                            </span>
                          </Button>
                        </div>
                        <div className='flex max-h-40 gap-2 overflow-x-auto pb-1'>
                          {job.images.map((img) => (
                            <button
                              key={img.pageIndex}
                              type='button'
                              className='group relative flex h-20 w-16 flex-none items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-[10px] text-zinc-500 ring-1 ring-zinc-200 transition hover:ring-sky-500 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:ring-sky-500'
                              onClick={() => downloadSingleImage(job, img)}
                            >
                              <img
                                src={img.url}
                                alt={`第 ${img.pageIndex} 页预览`}
                                className='h-full w-full object-cover'
                                loading='lazy'
                              />
                              <span className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 pb-0.5 pt-2 text-[10px] text-white'>
                                第 {img.pageIndex} 页
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type ImagesToPdfPanelProps = {
  dropzone: ReturnType<typeof useDropzone>
  images: ImageItem[]
  pagePreset: PagePreset
  setPagePreset: (v: PagePreset) => void
  unit: Unit
  setUnit: (v: Unit) => void
  customWidth: number
  setCustomWidth: (v: number) => void
  customHeight: number
  setCustomHeight: (v: number) => void
  orientation: 'portrait' | 'landscape'
  setOrientation: (v: 'portrait' | 'landscape') => void
  margin: number
  setMargin: (v: number) => void
  fitMode: FitMode
  setFitMode: (v: FitMode) => void
  background: string
  setBackground: (v: string) => void
  jpegQuality: number
  setJpegQuality: (v: number) => void
  title: string
  setTitle: (v: string) => void
  author: string
  setAuthor: (v: string) => void
  status: 'idle' | 'processing' | 'done' | 'error'
  error: string | null
  progress: number
  etaMs?: number
  moveImage: (from: number, to: number) => void
  removeImage: (id: string) => void
  clearAllImages: () => void
  generatePdf: () => void
  cancel: () => void
}

function ImagesToPdfPanel(props: ImagesToPdfPanelProps) {
  const {
    dropzone,
    images,
    pagePreset,
    setPagePreset,
    unit,
    setUnit,
    customWidth,
    setCustomWidth,
    customHeight,
    setCustomHeight,
    orientation,
    setOrientation,
    margin,
    setMargin,
    fitMode,
    setFitMode,
    background,
    setBackground,
    jpegQuality,
    setJpegQuality,
    title,
    setTitle,
    author,
    setAuthor,
    status,
    error,
    progress,
    etaMs,
    moveImage,
    removeImage,
    clearAllImages,
    generatePdf,
    cancel,
  } = props

  const { getRootProps, getInputProps, isDragActive } = dropzone
  const isProcessing = status === 'processing'

  return (
    <div className='space-y-4'>
      <div
        {...getRootProps({
          className: cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 transition hover:border-emerald-400 hover:bg-emerald-50/70 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:bg-zinc-900',
            isDragActive && 'border-emerald-500 bg-emerald-50/80 dark:bg-zinc-900',
          ),
        })}
      >
        <input {...getInputProps()} />
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300'>
            <ImageIcon className='h-5 w-5' />
          </div>
          <div className='text-left'>
            <p className='text-sm font-medium text-zinc-800 dark:text-zinc-100'>拖拽图片到此处，或点击选择图片</p>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>支持 PNG / JPG / WebP · 支持拖拽重新排序页面顺序</p>
          </div>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
        <div className='space-y-4'>
          <div className='grid gap-3 rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>页面尺寸</Label>
                <div className='flex flex-wrap gap-2'>
                  {(
                    [
                      { value: 'A4', label: 'A4' },
                      { value: 'Letter', label: 'Letter' },
                      { value: 'Custom', label: '自定义' },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.value}
                      type='button'
                      size='sm'
                      variant={pagePreset === opt.value ? 'default' : 'outline'}
                      className='flex-1 whitespace-nowrap px-2 text-[11px]'
                      onClick={() => setPagePreset(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>方向与单位</Label>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant={orientation === 'portrait' ? 'default' : 'outline'}
                    className='flex-1 whitespace-nowrap px-2 text-[11px]'
                    onClick={() => setOrientation('portrait')}
                  >
                    竖向
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant={orientation === 'landscape' ? 'default' : 'outline'}
                    className='flex-1 whitespace-nowrap px-2 text-[11px]'
                    onClick={() => setOrientation('landscape')}
                  >
                    横向
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant={unit === 'mm' ? 'default' : 'outline'}
                    className='w-14 whitespace-nowrap px-2 text-[11px]'
                    onClick={() => setUnit(unit === 'mm' ? 'px' : 'mm')}
                  >
                    {unit === 'mm' ? 'mm' : 'px'}
                  </Button>
                </div>
              </div>
            </div>

            {pagePreset === 'Custom' && (
              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>宽度（{unit}）</Label>
                  <Input
                    type='number'
                    min={10}
                    max={2000}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value) || 0)}
                    className='h-8 text-xs'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>高度（{unit}）</Label>
                  <Input
                    type='number'
                    min={10}
                    max={2000}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value) || 0)}
                    className='h-8 text-xs'
                  />
                </div>
              </div>
            )}

            <Separator className='my-1' />

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <Label>页面边距</Label>
                  <span className='text-[11px] text-zinc-500'>
                    {margin}
                    {unit}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={unit === 'mm' ? 40 : 200}
                  step={unit === 'mm' ? 1 : 5}
                  value={[margin]}
                  onValueChange={([v]) => setMargin(v)}
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>适配模式</Label>
                <div className='flex gap-2'>
                  {(
                    [
                      { value: 'contain', label: '完整显示（contain）' },
                      { value: 'cover', label: '铺满裁切（cover）' },
                      { value: 'stretch', label: '拉伸填满（stretch）' },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.value}
                      type='button'
                      size='sm'
                      variant={fitMode === opt.value ? 'default' : 'outline'}
                      className='flex-1 whitespace-nowrap px-2 text-[11px]'
                      onClick={() => setFitMode(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>背景色</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='color'
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className='h-8 w-16 cursor-pointer p-1'
                  />
                  <Input
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className='h-8 flex-1 text-xs'
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <Label>JPEG 压缩质量</Label>
                  <span className='text-[11px] text-zinc-500'>{Math.round(jpegQuality * 100)}%</span>
                </div>
                <Slider
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={[jpegQuality]}
                  onValueChange={([v]) => setJpegQuality(v)}
                />
              </div>
            </div>

            <Separator className='my-1' />

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>PDF 标题（可选）</Label>
                <Input
                  placeholder='例如：项目方案扫描整理版'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className='h-8 text-xs'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs'>作者/来源（可选）</Label>
                <Input
                  placeholder='例如：个人整理 / 部门名称'
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className='h-8 text-xs'
                />
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              onClick={generatePdf}
              disabled={!images.length || isProcessing}
              className='inline-flex items-center gap-1.5'
            >
              {isProcessing ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Download className='h-4 w-4' />
              )}
              <span>{isProcessing ? '正在生成 PDF…' : '生成并下载 PDF'}</span>
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={!images.length}
              onClick={clearAllImages}
              className='inline-flex items-center gap-1.5'
            >
              <Trash2 className='h-4 w-4' />
              清空图片
            </Button>
            {isProcessing && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={cancel}
                className='inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700'
              >
                <AlertTriangle className='h-4 w-4' />
                取消当前生成
              </Button>
            )}
          </div>
        </div>

        <div className='space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-4'>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-medium text-zinc-800 dark:text-zinc-100'>页面顺序与预览</p>
            <span className='text-[11px] text-zinc-500 dark:text-zinc-400'>共 {images.length} 张图片</span>
          </div>
          <Separator />
          {images.length === 0 ? (
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>暂未添加图片。建议先选好顺序再生成 PDF，也可以在下方通过拖拽微调顺序。</p>
          ) : (
            <>
              <div className='space-y-2 max-h-56 overflow-y-auto pr-1'>
                {images.map((img, index) => (
                  <DraggableImageItem
                    key={img.id}
                    item={img}
                    index={index}
                    onMove={moveImage}
                    onRemove={removeImage}
                  />
                ))}
              </div>
              <Separator />
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400'>
                  <span>生成进度</span>
                  <span>
                    {progress}% · {formatEta(etaMs)}
                  </span>
                </div>
                <Progress value={progress} className='h-1.5' />
                {status === 'error' && error && (
                  <p className='text-[11px] text-red-500'>{error}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- FAQ item ----------

type FaqItemProps = {
  question: string
  answer: string
}

function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <div className='space-y-2 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-600 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300'>
      <div className='flex items-start gap-2'>
        <div className='mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-300'>
          <HelpCircle className='h-3.5 w-3.5' />
        </div>
        <h3 className='text-xs font-semibold text-zinc-800 dark:text-zinc-100'>{question}</h3>
      </div>
      <p className='pl-7 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300'>{answer}</p>
    </div>
  )
}

export default App
