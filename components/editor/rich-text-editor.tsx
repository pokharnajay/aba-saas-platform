'use client'

import dynamic from 'next/dynamic'
import { useMemo, useCallback, useEffect, useState, useRef } from 'react'
import 'react-quill-new/dist/quill.snow.css'
import { cn } from '@/lib/utils'

// Store editor instance globally for external access
let globalEditorInstance: any = null

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new')
    // Register the Size format with custom values
    const Quill = (await import('quill')).default
    const Size = Quill.import('attributors/style/size') as any
    Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px']
    Quill.register(Size, true)
    return RQ
  },
  {
    ssr: false,
    loading: () => (
      <div className="border border-slate-200 rounded-lg bg-white min-h-[300px] flex items-center justify-center">
        <span className="text-slate-400">Loading editor...</span>
      </div>
    ),
  }
)

// Custom Image Resize Overlay Component
function ImageResizeOverlay({
  targetImage,
  onResize,
  onClose
}: {
  targetImage: HTMLImageElement | null
  onResize: (width: number, height: number) => void
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const isResizing = useRef(false)
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const aspectRatio = useRef(1)

  useEffect(() => {
    if (targetImage) {
      const rect = targetImage.getBoundingClientRect()
      const containerRect = targetImage.closest('.ql-editor')?.getBoundingClientRect()
      if (containerRect) {
        setPosition({
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
        })
      }
      setSize({ width: rect.width, height: rect.height })
      aspectRatio.current = rect.width / rect.height
    }
  }, [targetImage])

  const handleMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return

      const deltaX = moveEvent.clientX - startPos.current.x
      const deltaY = moveEvent.clientY - startPos.current.y

      let newWidth = startPos.current.width
      let newHeight = startPos.current.height

      if (corner.includes('e')) {
        newWidth = Math.max(50, startPos.current.width + deltaX)
      }
      if (corner.includes('w')) {
        newWidth = Math.max(50, startPos.current.width - deltaX)
      }
      if (corner.includes('s')) {
        newHeight = Math.max(50, startPos.current.height + deltaY)
      }
      if (corner.includes('n')) {
        newHeight = Math.max(50, startPos.current.height - deltaY)
      }

      // Maintain aspect ratio for corner handles
      if (corner.length === 2) {
        newHeight = newWidth / aspectRatio.current
      }

      setSize({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        onResize(size.width, size.height)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [size, onResize])

  // Apply size changes to the actual image
  useEffect(() => {
    if (targetImage && size.width > 0 && size.height > 0) {
      targetImage.style.width = `${size.width}px`
      targetImage.style.height = `${size.height}px`
    }
  }, [size, targetImage])

  if (!targetImage) return null

  return (
    <div
      ref={overlayRef}
      className="absolute pointer-events-auto z-50"
      style={{
        top: position.top,
        left: position.left,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Border */}
      <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

      {/* Corner handles */}
      {['nw', 'ne', 'sw', 'se'].map((corner) => (
        <div
          key={corner}
          className={`absolute w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-${corner}-resize`}
          style={{
            top: corner.includes('n') ? -6 : 'auto',
            bottom: corner.includes('s') ? -6 : 'auto',
            left: corner.includes('w') ? -6 : 'auto',
            right: corner.includes('e') ? -6 : 'auto',
          }}
          onMouseDown={(e) => handleMouseDown(e, corner)}
        />
      ))}

      {/* Edge handles */}
      {['n', 's', 'e', 'w'].map((edge) => (
        <div
          key={edge}
          className={`absolute bg-blue-500 ${
            edge === 'n' || edge === 's' ? 'w-6 h-2 left-1/2 -translate-x-1/2' : 'h-6 w-2 top-1/2 -translate-y-1/2'
          } cursor-${edge}-resize rounded-sm`}
          style={{
            top: edge === 'n' ? -4 : edge === 's' ? 'auto' : undefined,
            bottom: edge === 's' ? -4 : undefined,
            left: edge === 'w' ? -4 : undefined,
            right: edge === 'e' ? -4 : undefined,
          }}
          onMouseDown={(e) => handleMouseDown(e, edge)}
        />
      ))}

      {/* Size indicator */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
        {Math.round(size.width)} × {Math.round(size.height)}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute -top-8 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm hover:bg-red-600"
      >
        ×
      </button>
    </div>
  )
}

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  onEditorReady?: (editor: any) => void
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className,
  editable = true,
  onEditorReady,
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Handle image click for resizing
  useEffect(() => {
    if (!isMounted || !editorContainerRef.current) return

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.ql-editor')) {
        e.preventDefault()
        e.stopPropagation()
        setSelectedImage(target as HTMLImageElement)
      } else if (!target.closest('.image-resize-overlay')) {
        setSelectedImage(null)
      }
    }

    const container = editorContainerRef.current
    container.addEventListener('click', handleImageClick)

    return () => {
      container.removeEventListener('click', handleImageClick)
    }
  }, [isMounted])

  const handleImageResize = useCallback((width: number, height: number) => {
    if (selectedImage) {
      selectedImage.setAttribute('width', String(Math.round(width)))
      selectedImage.setAttribute('height', String(Math.round(height)))
      selectedImage.style.width = `${width}px`
      selectedImage.style.height = `${height}px`
      // Trigger onChange to save the updated HTML
      if (globalEditorInstance) {
        const html = globalEditorInstance.root?.innerHTML || ''
        onChange(html)
      }
    }
  }, [selectedImage, onChange])

  const handleCloseResize = useCallback(() => {
    setSelectedImage(null)
  }, [])

  // Image handler for uploading images - uses DOM to find editor
  const imageHandler = useCallback(() => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (globalEditorInstance) {
            const range = globalEditorInstance.getSelection(true)
            globalEditorInstance.insertEmbed(range?.index || 0, 'image', e.target?.result)
            globalEditorInstance.setSelection((range?.index || 0) + 1)
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }, [])

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ size: ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [imageHandler]
  )

  const formats = [
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'align',
    'list',
    'blockquote',
    'code-block',
    'link',
    'image',
  ]

  // Handle content change - Quill returns HTML
  const handleChange = useCallback(
    (value: string, _delta: any, _source: string, editor: any) => {
      // Store editor reference for external access
      if (editor && !editorReady) {
        globalEditorInstance = editor
        setEditorReady(true)
        onEditorReady?.(editor)
      }

      // Quill returns <p><br></p> for empty content, normalize to empty string
      const isEmpty = value === '<p><br></p>' || value === '<p></p>' || !value
      onChange(isEmpty ? '' : value)
    },
    [onChange, editorReady, onEditorReady]
  )

  if (!isMounted) {
    return (
      <div className="border border-slate-200 rounded-lg bg-white min-h-[300px] flex items-center justify-center">
        <span className="text-slate-400">Loading editor...</span>
      </div>
    )
  }

  return (
    <div ref={editorContainerRef} className={cn('rich-text-editor-wrapper relative', className)}>
      <ReactQuill
        theme="snow"
        value={content}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={!editable}
      />
      {selectedImage && (
        <div className="image-resize-overlay">
          <ImageResizeOverlay
            targetImage={selectedImage}
            onResize={handleImageResize}
            onClose={handleCloseResize}
          />
        </div>
      )}
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: 300px;
          font-size: 16px;
          font-family: inherit;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 300px;
          padding: 16px;
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          font-style: normal;
          color: #94a3b8;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: #f8fafc;
          border-color: #e2e8f0;
          flex-wrap: wrap;
        }
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          border-color: #e2e8f0;
        }
        .rich-text-editor-wrapper .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
          cursor: pointer;
        }
        .rich-text-editor-wrapper .ql-editor img:hover {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
        .rich-text-editor-wrapper .ql-snow .ql-tooltip {
          z-index: 1000;
        }
        .rich-text-editor-wrapper .ql-snow.ql-toolbar button:hover,
        .rich-text-editor-wrapper .ql-snow .ql-toolbar button:hover {
          color: #2563eb;
        }
        .rich-text-editor-wrapper .ql-snow.ql-toolbar button.ql-active,
        .rich-text-editor-wrapper .ql-snow .ql-toolbar button.ql-active {
          color: #2563eb;
        }
        .rich-text-editor-wrapper .ql-snow .ql-stroke {
          stroke: #64748b;
        }
        .rich-text-editor-wrapper .ql-snow .ql-fill {
          fill: #64748b;
        }
        .rich-text-editor-wrapper .ql-snow.ql-toolbar button:hover .ql-stroke,
        .rich-text-editor-wrapper .ql-snow .ql-toolbar button:hover .ql-stroke {
          stroke: #2563eb;
        }
        .rich-text-editor-wrapper .ql-snow.ql-toolbar button.ql-active .ql-stroke,
        .rich-text-editor-wrapper .ql-snow .ql-toolbar button.ql-active .ql-stroke {
          stroke: #2563eb;
        }
        .rich-text-editor-wrapper .ql-snow.ql-toolbar button:hover .ql-fill,
        .rich-text-editor-wrapper .ql-snow .ql-toolbar button:hover .ql-fill {
          fill: #2563eb;
        }
        .rich-text-editor-wrapper .ql-snow.ql-toolbar button.ql-active .ql-fill,
        .rich-text-editor-wrapper .ql-snow .ql-toolbar button.ql-active .ql-fill {
          fill: #2563eb;
        }
        /* Size dropdown styling */
        .rich-text-editor-wrapper .ql-snow .ql-picker {
          color: #64748b;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: 'Size';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before {
          content: '10';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before {
          content: '12';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before {
          content: '14';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before {
          content: '16';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before {
          content: '18';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before {
          content: '20';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before {
          content: '24';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before {
          content: '28';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before {
          content: '32';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="36px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="36px"]::before {
          content: '36';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="48px"]::before,
        .rich-text-editor-wrapper .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="48px"]::before {
          content: '48';
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-options {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 4px;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-item:hover {
          color: #2563eb;
        }
        /* Color picker styling */
        .rich-text-editor-wrapper .ql-snow .ql-color-picker .ql-picker-options,
        .rich-text-editor-wrapper .ql-snow .ql-background .ql-picker-options {
          padding: 8px;
          width: auto;
        }
        /* Image resize cursors */
        .cursor-nw-resize { cursor: nw-resize !important; }
        .cursor-ne-resize { cursor: ne-resize !important; }
        .cursor-sw-resize { cursor: sw-resize !important; }
        .cursor-se-resize { cursor: se-resize !important; }
        .cursor-n-resize { cursor: n-resize !important; }
        .cursor-s-resize { cursor: s-resize !important; }
        .cursor-e-resize { cursor: e-resize !important; }
        .cursor-w-resize { cursor: w-resize !important; }
        /* Image selection styling */
        .rich-text-editor-wrapper .ql-editor img {
          transition: outline 0.15s ease;
        }
        .rich-text-editor-wrapper .ql-editor img.selected {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
