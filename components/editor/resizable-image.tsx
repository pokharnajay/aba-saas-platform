'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number; align?: string }) => ReturnType
    }
  }
}

function ResizableImageComponent({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<string | null>(null)
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 })

  const { src, alt, title, width, height, align = 'inline' } = node.attrs

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      setResizeDirection(direction)

      const img = imgRef.current
      if (img) {
        startPos.current = {
          x: e.clientX,
          y: e.clientY,
          width: img.offsetWidth,
          height: img.offsetHeight,
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      const aspectRatio = startPos.current.width / startPos.current.height

      let newWidth = startPos.current.width
      let newHeight = startPos.current.height

      switch (resizeDirection) {
        case 'se': // bottom-right
          newWidth = Math.max(50, startPos.current.width + dx)
          newHeight = newWidth / aspectRatio
          break
        case 'sw': // bottom-left
          newWidth = Math.max(50, startPos.current.width - dx)
          newHeight = newWidth / aspectRatio
          break
        case 'ne': // top-right
          newWidth = Math.max(50, startPos.current.width + dx)
          newHeight = newWidth / aspectRatio
          break
        case 'nw': // top-left
          newWidth = Math.max(50, startPos.current.width - dx)
          newHeight = newWidth / aspectRatio
          break
        case 'e': // right
          newWidth = Math.max(50, startPos.current.width + dx)
          break
        case 'w': // left
          newWidth = Math.max(50, startPos.current.width - dx)
          break
        case 's': // bottom
          newHeight = Math.max(50, startPos.current.height + dy)
          break
        case 'n': // top
          newHeight = Math.max(50, startPos.current.height - dy)
          break
      }

      updateAttributes({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      setResizeDirection(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeDirection, updateAttributes])

  // Determine wrapper classes based on alignment
  const getWrapperClasses = () => {
    switch (align) {
      case 'left':
        return 'block float-left mr-4 mb-2 clear-left'
      case 'center':
        return 'block mx-auto my-4 clear-both'
      case 'right':
        return 'block float-right ml-4 mb-2 clear-right'
      case 'inline':
      default:
        return 'inline-block align-top mx-1'
    }
  }

  return (
    <NodeViewWrapper
      as={align === 'inline' ? 'span' : 'div'}
      className={`relative ${getWrapperClasses()}`}
      style={{ display: align === 'inline' ? 'inline-block' : undefined, verticalAlign: align === 'inline' ? 'top' : undefined }}
    >
      <div
        className={`relative inline-block ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{
            width: width ? `${width}px` : 'auto',
            height: height ? `${height}px` : 'auto',
            maxWidth: '100%',
          }}
          className="rounded-lg block"
          draggable={false}
        />

        {/* Resize handles - only show when selected */}
        {selected && (
          <>
            {/* Corner handles */}
            <ResizeHandle direction="nw" onMouseDown={handleMouseDown} position="top-0 left-0 cursor-nw-resize" />
            <ResizeHandle direction="ne" onMouseDown={handleMouseDown} position="top-0 right-0 cursor-ne-resize" />
            <ResizeHandle direction="sw" onMouseDown={handleMouseDown} position="bottom-0 left-0 cursor-sw-resize" />
            <ResizeHandle direction="se" onMouseDown={handleMouseDown} position="bottom-0 right-0 cursor-se-resize" />

            {/* Edge handles */}
            <ResizeHandle direction="n" onMouseDown={handleMouseDown} position="top-0 left-1/2 -translate-x-1/2 cursor-n-resize" />
            <ResizeHandle direction="s" onMouseDown={handleMouseDown} position="bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize" />
            <ResizeHandle direction="e" onMouseDown={handleMouseDown} position="top-1/2 right-0 -translate-y-1/2 cursor-e-resize" />
            <ResizeHandle direction="w" onMouseDown={handleMouseDown} position="top-1/2 left-0 -translate-y-1/2 cursor-w-resize" />
          </>
        )}

        {/* Toolbar - only show when selected */}
        {selected && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-lg px-1 py-1 z-50">
            <button
              type="button"
              onClick={() => updateAttributes({ align: 'inline' })}
              className={`p-1.5 rounded hover:bg-slate-100 ${align === 'inline' ? 'bg-slate-200' : ''}`}
              title="Inline (allows multiple images per line)"
            >
              <span className="text-xs font-medium px-1">Inline</span>
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ align: 'left' })}
              className={`p-1.5 rounded hover:bg-slate-100 ${align === 'left' ? 'bg-slate-200' : ''}`}
              title="Float left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ align: 'center' })}
              className={`p-1.5 rounded hover:bg-slate-100 ${align === 'center' ? 'bg-slate-200' : ''}`}
              title="Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ align: 'right' })}
              className={`p-1.5 rounded hover:bg-slate-100 ${align === 'right' ? 'bg-slate-200' : ''}`}
              title="Float right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => deleteNode()}
              className="p-1.5 rounded hover:bg-red-100 text-red-600"
              title="Delete image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Size indicator */}
        {selected && width && height && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {Math.round(Number(width))} × {Math.round(Number(height))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

interface ResizeHandleProps {
  direction: string
  onMouseDown: (e: React.MouseEvent, direction: string) => void
  position: string
}

function ResizeHandle({ direction, onMouseDown, position }: ResizeHandleProps) {
  return (
    <div
      className={`absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm shadow-md hover:bg-blue-600 ${position}`}
      onMouseDown={(e) => onMouseDown(e, direction)}
      style={{ transform: position.includes('translate') ? undefined : 'translate(-50%, -50%)' }}
    />
  )
}

// Custom Image Extension with resize support
export const ResizableImage = Node.create({
  name: 'image',

  addOptions() {
    return {
      inline: true,
      allowBase64: true,
      HTMLAttributes: {},
    }
  },

  inline() {
    return true
  },

  group() {
    return 'inline'
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      align: {
        default: 'inline',
        parseHTML: (element) => element.getAttribute('data-align') || 'inline',
        renderHTML: (attributes) => {
          if (!attributes.align || attributes.align === 'inline') {
            return {}
          }
          return { 'data-align': attributes.align }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string; width?: number; height?: number }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
