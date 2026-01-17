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
  const [resizeHandles, setResizeHandles] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const aspectRatio = useRef(1)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Update resize handles position when image is selected
  const updateResizeHandles = useCallback((img: HTMLImageElement) => {
    const container = editorContainerRef.current
    if (!container) return

    const imgRect = img.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Position relative to the wrapper container (which has position: relative)
    setResizeHandles({
      top: imgRect.top - containerRect.top,
      left: imgRect.left - containerRect.left,
      width: imgRect.width,
      height: imgRect.height,
    })
  }, [])

  // Handle image click for resizing
  useEffect(() => {
    if (!isMounted || !editorContainerRef.current) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if clicked on resize handle
      if (target.closest('.resize-handle')) {
        return
      }

      // Check if clicked on an image in the editor
      if (target.tagName === 'IMG' && target.closest('.ql-editor')) {
        e.preventDefault()
        const img = target as HTMLImageElement
        setSelectedImage(img)
        aspectRatio.current = img.naturalWidth / img.naturalHeight || 1
        updateResizeHandles(img)
      } else if (!target.closest('.image-resize-controls')) {
        setSelectedImage(null)
        setResizeHandles(null)
      }
    }

    const container = editorContainerRef.current
    container.addEventListener('click', handleClick)

    return () => {
      container.removeEventListener('click', handleClick)
    }
  }, [isMounted, updateResizeHandles])

  // Update resize handles on scroll/resize
  useEffect(() => {
    if (!selectedImage) return

    const handleScrollOrResize = () => {
      if (selectedImage && document.body.contains(selectedImage)) {
        updateResizeHandles(selectedImage)
      } else {
        setSelectedImage(null)
        setResizeHandles(null)
      }
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [selectedImage, updateResizeHandles])

  // Monitor for image deletion (keyboard delete/backspace or programmatic removal)
  useEffect(() => {
    if (!selectedImage || !editorContainerRef.current) return

    const editorEl = editorContainerRef.current.querySelector('.ql-editor')
    if (!editorEl) return

    // Use MutationObserver to detect when image is removed from DOM
    const observer = new MutationObserver(() => {
      if (selectedImage && !document.body.contains(selectedImage)) {
        setSelectedImage(null)
        setResizeHandles(null)
      }
    })

    observer.observe(editorEl, {
      childList: true,
      subtree: true,
    })

    // Also listen for keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImage) {
        e.preventDefault()
        e.stopPropagation()

        // Remove the image from the DOM
        selectedImage.remove()

        // Clear selection immediately
        setSelectedImage(null)
        setResizeHandles(null)

        // Trigger onChange to save the updated content
        setTimeout(() => {
          if (globalEditorInstance && globalEditorInstance.root) {
            const html = globalEditorInstance.root.innerHTML || ''
            onChange(html)
          }
        }, 10)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedImage])

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedImage || !resizeHandles) return

    isResizing.current = true
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: resizeHandles.width,
      height: resizeHandles.height,
    }

    // Prevent text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current || !selectedImage) return

      const deltaX = moveEvent.clientX - resizeStart.current.x
      const deltaY = moveEvent.clientY - resizeStart.current.y

      let newWidth = resizeStart.current.width
      let newHeight = resizeStart.current.height

      // Calculate new dimensions based on direction
      if (direction.includes('e')) {
        newWidth = Math.max(50, resizeStart.current.width + deltaX)
      }
      if (direction.includes('w')) {
        newWidth = Math.max(50, resizeStart.current.width - deltaX)
      }
      if (direction.includes('s')) {
        newHeight = Math.max(50, resizeStart.current.height + deltaY)
      }
      if (direction.includes('n')) {
        newHeight = Math.max(50, resizeStart.current.height - deltaY)
      }

      // Maintain aspect ratio for corner handles
      if (direction.length === 2) {
        newHeight = newWidth / aspectRatio.current
      }

      // Apply to image with smooth transition
      selectedImage.style.width = `${newWidth}px`
      selectedImage.style.height = `${newHeight}px`
      selectedImage.setAttribute('width', String(Math.round(newWidth)))
      selectedImage.setAttribute('height', String(Math.round(newHeight)))

      // Update handles position
      setResizeHandles(prev => prev ? { ...prev, width: newWidth, height: newHeight } : null)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // Re-enable text selection
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''

      // Update handles position after resize completes
      if (selectedImage) {
        updateResizeHandles(selectedImage)
      }

      // Trigger onChange to save - use setTimeout to let DOM settle
      setTimeout(() => {
        if (globalEditorInstance && globalEditorInstance.root) {
          const html = globalEditorInstance.root.innerHTML || ''
          onChange(html)
        }
      }, 10)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [selectedImage, resizeHandles, onChange, updateResizeHandles])

  // Image handler for uploading images
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

  // Handle content change
  const handleChange = useCallback(
    (value: string, _delta: any, _source: string, editor: any) => {
      if (editor && !editorReady) {
        globalEditorInstance = editor
        setEditorReady(true)
        onEditorReady?.(editor)
      }

      const isEmpty = value === '<p><br></p>' || value === '<p></p>' || !value
      onChange(isEmpty ? '' : value)
    },
    [onChange, editorReady, onEditorReady]
  )

  // Add tooltips to toolbar buttons after mount
  useEffect(() => {
    if (!isMounted || !editorContainerRef.current) return

    const addTooltips = () => {
      const toolbar = editorContainerRef.current?.querySelector('.ql-toolbar')
      if (!toolbar) return

      const tooltipMap: Record<string, string> = {
        '.ql-bold': 'Bold (Ctrl+B)',
        '.ql-italic': 'Italic (Ctrl+I)',
        '.ql-underline': 'Underline (Ctrl+U)',
        '.ql-strike': 'Strikethrough',
        '.ql-link': 'Insert Link',
        '.ql-image': 'Insert Image',
        '.ql-blockquote': 'Block Quote',
        '.ql-code-block': 'Code Block',
        '.ql-clean': 'Clear Formatting',
        '.ql-list[value="ordered"]': 'Numbered List',
        '.ql-list[value="bullet"]': 'Bullet List',
        '.ql-align .ql-picker-label': 'Text Alignment',
        '.ql-color .ql-picker-label': 'Text Color',
        '.ql-background .ql-picker-label': 'Background Color',
        '.ql-size .ql-picker-label': 'Font Size',
      }

      Object.entries(tooltipMap).forEach(([selector, tooltip]) => {
        const elements = toolbar.querySelectorAll(selector)
        elements.forEach((el) => {
          el.setAttribute('title', tooltip)
        })
      })

      // Alignment buttons
      const alignButtons = toolbar.querySelectorAll('.ql-align .ql-picker-item')
      alignButtons.forEach((btn) => {
        const value = btn.getAttribute('data-value')
        if (value === 'center') btn.setAttribute('title', 'Center Align')
        else if (value === 'right') btn.setAttribute('title', 'Right Align')
        else if (value === 'justify') btn.setAttribute('title', 'Justify')
        else btn.setAttribute('title', 'Left Align')
      })
    }

    // Wait for toolbar to render
    const timer = setTimeout(addTooltips, 500)
    return () => clearTimeout(timer)
  }, [isMounted, editorReady])

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

      {/* Image Resize Handles */}
      {selectedImage && resizeHandles && (
        <div
          className="image-resize-controls absolute pointer-events-none transition-opacity duration-150"
          style={{
            top: resizeHandles.top,
            left: resizeHandles.left,
            width: resizeHandles.width,
            height: resizeHandles.height,
            zIndex: 100,
          }}
        >
          {/* Border with subtle shadow */}
          <div className="absolute inset-0 border-2 border-blue-500 rounded shadow-sm" />

          {/* Corner handles - larger and smoother like Google Docs */}
          <div
            className="resize-handle absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full pointer-events-auto hover:scale-125 transition-transform shadow-md"
            style={{ top: -8, left: -8, cursor: 'nw-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="resize-handle absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full pointer-events-auto hover:scale-125 transition-transform shadow-md"
            style={{ top: -8, right: -8, cursor: 'ne-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="resize-handle absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full pointer-events-auto hover:scale-125 transition-transform shadow-md"
            style={{ bottom: -8, left: -8, cursor: 'sw-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="resize-handle absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full pointer-events-auto hover:scale-125 transition-transform shadow-md"
            style={{ bottom: -8, right: -8, cursor: 'se-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />

          {/* Edge handles - invisible but larger click area like Google Docs */}
          <div
            className="resize-handle absolute h-3 pointer-events-auto hover:bg-blue-500/10 transition-colors"
            style={{ top: -6, left: 16, right: 16, cursor: 'n-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          <div
            className="resize-handle absolute h-3 pointer-events-auto hover:bg-blue-500/10 transition-colors"
            style={{ bottom: -6, left: 16, right: 16, cursor: 's-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div
            className="resize-handle absolute w-3 pointer-events-auto hover:bg-blue-500/10 transition-colors"
            style={{ left: -6, top: 16, bottom: 16, cursor: 'w-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div
            className="resize-handle absolute w-3 pointer-events-auto hover:bg-blue-500/10 transition-colors"
            style={{ right: -6, top: 16, bottom: 16, cursor: 'e-resize' }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />

          {/* Size indicator with smooth animation */}
          <div
            className="absolute bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ bottom: -32, left: '50%', transform: 'translateX(-50%)' }}
          >
            {Math.round(resizeHandles.width)} × {Math.round(resizeHandles.height)} px
          </div>
        </div>
      )}

      <style jsx global>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: 300px;
          font-size: 16px;
          font-family: inherit;
          position: relative;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 300px;
          padding: 16px;
          position: relative;
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
          border-radius: 6px;
          margin: 8px 0;
          cursor: pointer;
          display: inline-block;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .rich-text-editor-wrapper .ql-editor img:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transform: scale(1.005);
        }
        .rich-text-editor-wrapper .ql-snow .ql-tooltip {
          z-index: 1000;
        }
        /* Toolbar button hover and active states */
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
        /* Toolbar tooltips */
        .rich-text-editor-wrapper .ql-toolbar button[title],
        .rich-text-editor-wrapper .ql-toolbar .ql-picker-label[title] {
          position: relative;
        }
      `}</style>
    </div>
  )
}
