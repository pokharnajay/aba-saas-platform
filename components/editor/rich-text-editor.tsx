'use client'

import dynamic from 'next/dynamic'
import { useMemo, useCallback, useEffect, useState } from 'react'
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

  useEffect(() => {
    setIsMounted(true)
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
    <div className={cn('rich-text-editor-wrapper', className)}>
      <ReactQuill
        theme="snow"
        value={content}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={!editable}
      />
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
      `}</style>
    </div>
  )
}
