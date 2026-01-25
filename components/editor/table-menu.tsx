'use client'

import { useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import {
  Plus,
  Minus,
  Trash2,
  RowsIcon,
  ColumnsIcon,
  Merge,
  Split,
  PanelTop,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TableMenuProps {
  editor: Editor
  onInsertTable: (rows: number, cols: number) => void
  onClose: () => void
}

export function TableMenu({ editor, onInsertTable, onClose }: TableMenuProps) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null)
  const [isInTable, setIsInTable] = useState(editor.isActive('table'))

  // Grid for table size selection
  const GRID_SIZE = 6

  const handleGridHover = useCallback((row: number, col: number) => {
    setHoverCell({ row, col })
  }, [])

  const handleGridClick = useCallback((row: number, col: number) => {
    onInsertTable(row, col)
  }, [onInsertTable])

  const handleGridLeave = useCallback(() => {
    setHoverCell(null)
  }, [])

  // Check if we're in a table
  const inTable = editor.isActive('table')

  return (
    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-3 min-w-[200px]">
      {!inTable ? (
        // Insert Table Grid
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">Insert Table</div>
          <div
            className="grid gap-1 p-1 bg-slate-50 rounded"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
            onMouseLeave={handleGridLeave}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const row = Math.floor(index / GRID_SIZE) + 1
              const col = (index % GRID_SIZE) + 1
              const isHighlighted = hoverCell && row <= hoverCell.row && col <= hoverCell.col

              return (
                <div
                  key={index}
                  className={cn(
                    'w-5 h-5 border border-slate-300 rounded-sm cursor-pointer transition-colors',
                    isHighlighted ? 'bg-blue-500 border-blue-500' : 'bg-white hover:bg-slate-100'
                  )}
                  onMouseEnter={() => handleGridHover(row, col)}
                  onClick={() => handleGridClick(row, col)}
                />
              )
            })}
          </div>
          {hoverCell && (
            <div className="text-center text-xs text-slate-500 mt-2">
              {hoverCell.row} × {hoverCell.col}
            </div>
          )}
        </div>
      ) : (
        // Table Operations
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500 mb-2">Table Operations</div>

          {/* Row Operations */}
          <div className="text-xs text-slate-400 uppercase mt-2 mb-1">Rows</div>
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().addRowBefore().run()
              onClose()
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
            label="Add row above"
          />
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().addRowAfter().run()
              onClose()
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
            label="Add row below"
          />
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().deleteRow().run()
              onClose()
            }}
            icon={<Minus className="h-3.5 w-3.5" />}
            label="Delete row"
            danger
          />

          {/* Column Operations */}
          <div className="text-xs text-slate-400 uppercase mt-3 mb-1">Columns</div>
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().addColumnBefore().run()
              onClose()
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
            label="Add column before"
          />
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().addColumnAfter().run()
              onClose()
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
            label="Add column after"
          />
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().deleteColumn().run()
              onClose()
            }}
            icon={<Minus className="h-3.5 w-3.5" />}
            label="Delete column"
            danger
          />

          {/* Cell Operations */}
          <div className="text-xs text-slate-400 uppercase mt-3 mb-1">Cells</div>
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().mergeCells().run()
              onClose()
            }}
            icon={<Merge className="h-3.5 w-3.5" />}
            label="Merge cells"
            disabled={!editor.can().mergeCells()}
          />
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().splitCell().run()
              onClose()
            }}
            icon={<Split className="h-3.5 w-3.5" />}
            label="Split cell"
            disabled={!editor.can().splitCell()}
          />

          {/* Header Operations */}
          <div className="text-xs text-slate-400 uppercase mt-3 mb-1">Headers</div>
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().toggleHeaderRow().run()
              onClose()
            }}
            icon={<PanelTop className="h-3.5 w-3.5" />}
            label="Toggle header row"
          />
          <TableMenuButton
            onClick={() => {
              editor.chain().focus().toggleHeaderColumn().run()
              onClose()
            }}
            icon={<PanelLeft className="h-3.5 w-3.5" />}
            label="Toggle header column"
          />

          {/* Delete Table */}
          <div className="border-t border-slate-200 mt-3 pt-2">
            <TableMenuButton
              onClick={() => {
                editor.chain().focus().deleteTable().run()
                onClose()
              }}
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete table"
              danger
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Table Menu Button Component
interface TableMenuButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  danger?: boolean
  disabled?: boolean
}

function TableMenuButton({ onClick, icon, label, danger, disabled }: TableMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-slate-700 hover:bg-slate-100'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
