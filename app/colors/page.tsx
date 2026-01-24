'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface ColorItem {
  name: string
  hex: string
  tailwind?: string
  usage: string
}

const blueColors: ColorItem[] = [
  { name: 'Blue 50', hex: '#eff6ff', tailwind: 'blue-50', usage: 'Light backgrounds, hover states' },
  { name: 'Blue 100', hex: '#dbeafe', tailwind: 'blue-100', usage: 'Badges, light backgrounds, notification highlights' },
  { name: 'Blue 200', hex: '#bfdbfe', tailwind: 'blue-200', usage: 'Borders, info boxes' },
  { name: 'Blue 300', hex: '#93c5fd', tailwind: 'blue-300', usage: 'Available for use' },
  { name: 'Blue 400', hex: '#60a5fa', tailwind: 'blue-400', usage: 'Available for use' },
  { name: 'Blue 500', hex: '#3b82f6', tailwind: 'blue-500', usage: 'Focus rings, outlines, image resize handles' },
  { name: 'Blue 600', hex: '#2563eb', tailwind: 'blue-600', usage: 'Primary buttons, links, headings, icons' },
  { name: 'Blue 700', hex: '#1d4ed8', tailwind: 'blue-700', usage: 'Button hover states, darker accents' },
  { name: 'Blue 800', hex: '#1e40af', tailwind: 'blue-800', usage: 'Text on light blue backgrounds' },
  { name: 'Blue 900', hex: '#1e3a8a', tailwind: 'blue-900', usage: 'Dark text accents' },
]

const whiteColors: ColorItem[] = [
  { name: 'Pure White', hex: '#ffffff', tailwind: 'white', usage: 'Card backgrounds, dialogs, button text' },
  { name: 'Slate 50', hex: '#f8fafc', tailwind: 'slate-50', usage: 'Page backgrounds, table headers' },
  { name: 'Gray 50', hex: '#f9fafb', tailwind: 'gray-50', usage: 'Alternative light background' },
  { name: 'Gray 100', hex: '#f3f4f6', tailwind: 'gray-100', usage: 'Credential boxes, input backgrounds' },
  { name: 'Slate 100', hex: '#f1f5f9', tailwind: 'slate-100', usage: 'Code block backgrounds' },
  { name: 'Gray 200', hex: '#e5e7eb', tailwind: 'gray-200', usage: 'Dividers, borders' },
  { name: 'Slate 200', hex: '#e2e8f0', tailwind: 'slate-200', usage: 'Table borders, editor borders' },
]

const emailColors: ColorItem[] = [
  { name: 'Email Background', hex: '#f5f5f5', usage: 'Email body background' },
  { name: 'Email Card', hex: '#ffffff', usage: 'Email content card' },
  { name: 'Email Primary', hex: '#2563eb', usage: 'Buttons, headings in emails' },
  { name: 'Email Text Dark', hex: '#1f2937', usage: 'Headings, important text' },
  { name: 'Email Text Medium', hex: '#4b5563', usage: 'Body text' },
  { name: 'Email Text Light', hex: '#6b7280', usage: 'Secondary text' },
  { name: 'Email Text Muted', hex: '#9ca3af', usage: 'Footer, disclaimers' },
  { name: 'Email Divider', hex: '#e5e7eb', usage: 'Horizontal rules' },
  { name: 'Email Warning BG', hex: '#fef2f2', usage: 'Warning box background' },
  { name: 'Email Warning Border', hex: '#ef4444', usage: 'Warning box border' },
  { name: 'Email Highlight', hex: '#fef3c7', usage: 'Password highlight background' },
]

const otherColors: ColorItem[] = [
  { name: 'Sidebar Dark', hex: '#111827', tailwind: 'gray-900', usage: 'Sidebar background' },
  { name: 'Sidebar Item', hex: '#1f2937', tailwind: 'gray-800', usage: 'Active sidebar item' },
  { name: 'Text Primary', hex: '#1e293b', tailwind: 'slate-800', usage: 'Main body text' },
  { name: 'Text Secondary', hex: '#475569', tailwind: 'slate-600', usage: 'Secondary text' },
  { name: 'Text Muted', hex: '#64748b', tailwind: 'slate-500', usage: 'Muted/placeholder text' },
  { name: 'Success', hex: '#10b981', tailwind: 'emerald-500', usage: 'Success states' },
  { name: 'Warning', hex: '#f59e0b', tailwind: 'amber-500', usage: 'Warning states' },
  { name: 'Error', hex: '#ef4444', tailwind: 'red-500', usage: 'Error states' },
]

function ColorSwatch({ color }: { color: ColorItem }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLight = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 155
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div
        className="w-16 h-16 rounded-lg border border-gray-300 flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: color.hex }}
      >
        <span
          className="text-xs font-mono"
          style={{ color: isLight(color.hex) ? '#1f2937' : '#ffffff' }}
        >
          {color.hex}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{color.name}</span>
          {color.tailwind && (
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
              {color.tailwind}
            </code>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5 truncate">{color.usage}</p>
      </div>

      <button
        onClick={() => copyToClipboard(color.hex)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        title="Copy hex code"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  )
}

function ColorSection({ title, colors, bgClass = 'bg-gray-50' }: { title: string; colors: ColorItem[]; bgClass?: string }) {
  return (
    <div className={`rounded-xl p-6 ${bgClass}`}>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {colors.map((color) => (
          <ColorSwatch key={color.name} color={color} />
        ))}
      </div>
    </div>
  )
}

export default function ColorsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Color Palette</h1>
        <p className="text-gray-500 mt-2">All blue and white color codes used in the ABA SaaS platform. Click to copy.</p>
      </div>

      <ColorSection
        title="Blue Colors (Primary)"
        colors={blueColors}
        bgClass="bg-blue-50/50"
      />

      <ColorSection
        title="White & Light Colors"
        colors={whiteColors}
        bgClass="bg-gray-50"
      />

      <ColorSection
        title="Email Template Colors"
        colors={emailColors}
        bgClass="bg-amber-50/50"
      />

      <ColorSection
        title="Other UI Colors"
        colors={otherColors}
        bgClass="bg-slate-50"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">CSS Variables (globals.css)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
          <div className="space-y-2">
            <p className="text-gray-500">/* Light Mode */</p>
            <p><span className="text-blue-600">--primary:</span> 221.2 83.2% 53.3%</p>
            <p><span className="text-blue-600">--background:</span> 0 0% 100%</p>
            <p><span className="text-blue-600">--foreground:</span> 222.2 84% 4.9%</p>
            <p><span className="text-blue-600">--ring:</span> 221.2 83.2% 53.3%</p>
          </div>
          <div className="space-y-2">
            <p className="text-gray-500">/* Computed Hex */</p>
            <p><span className="text-gray-600">Primary →</span> #3b82f6</p>
            <p><span className="text-gray-600">Background →</span> #ffffff</p>
            <p><span className="text-gray-600">Foreground →</span> #0f172a</p>
            <p><span className="text-gray-600">Ring →</span> #3b82f6</p>
          </div>
        </div>
      </div>
    </div>
  )
}
