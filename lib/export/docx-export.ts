'use client'

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ExternalHyperlink,
  ImageRun,
  convertInchesToTwip,
} from 'docx'
import { saveAs } from 'file-saver'

interface ExportDocxOptions {
  title?: string
  filename?: string
  author?: string
  description?: string
}

interface ParsedElement {
  type: string
  content?: string
  children?: ParsedElement[]
  href?: string
  level?: number
  align?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
  highlight?: string
  fontSize?: number
}

/**
 * Parse HTML string to structured elements
 */
function parseHTML(html: string): ParsedElement[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return parseNode(doc.body)
}

/**
 * Parse DOM node recursively
 */
function parseNode(node: Node): ParsedElement[] {
  const elements: ParsedElement[] = []

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim()
      if (text) {
        elements.push({ type: 'text', content: text })
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tagName = el.tagName.toLowerCase()

      switch (tagName) {
        case 'p':
          elements.push({
            type: 'paragraph',
            children: parseNode(el),
            align: getAlignment(el),
          })
          break
        case 'h1':
          elements.push({ type: 'heading', level: 1, children: parseNode(el) })
          break
        case 'h2':
          elements.push({ type: 'heading', level: 2, children: parseNode(el) })
          break
        case 'h3':
          elements.push({ type: 'heading', level: 3, children: parseNode(el) })
          break
        case 'strong':
        case 'b':
          elements.push({ type: 'bold', children: parseNode(el) })
          break
        case 'em':
        case 'i':
          elements.push({ type: 'italic', children: parseNode(el) })
          break
        case 'u':
          elements.push({ type: 'underline', children: parseNode(el) })
          break
        case 's':
        case 'strike':
          elements.push({ type: 'strike', children: parseNode(el) })
          break
        case 'a':
          elements.push({
            type: 'link',
            href: el.getAttribute('href') || '',
            children: parseNode(el),
          })
          break
        case 'ul':
          elements.push({ type: 'bulletList', children: parseNode(el) })
          break
        case 'ol':
          elements.push({ type: 'orderedList', children: parseNode(el) })
          break
        case 'li':
          elements.push({ type: 'listItem', children: parseNode(el) })
          break
        case 'blockquote':
          elements.push({ type: 'blockquote', children: parseNode(el) })
          break
        case 'code':
          elements.push({ type: 'code', content: el.textContent || '' })
          break
        case 'pre':
          elements.push({ type: 'codeBlock', content: el.textContent || '' })
          break
        case 'table':
          elements.push({ type: 'table', children: parseTableNode(el) })
          break
        case 'br':
          elements.push({ type: 'break' })
          break
        case 'hr':
          elements.push({ type: 'horizontalRule' })
          break
        case 'img':
          elements.push({
            type: 'image',
            content: el.getAttribute('src') || '',
          })
          break
        case 'span':
          // Check for styling
          const style = el.style
          const parsed: ParsedElement = { type: 'span', children: parseNode(el) }
          if (style.color) parsed.color = style.color
          if (style.backgroundColor) parsed.highlight = style.backgroundColor
          if (style.fontSize) parsed.fontSize = parseInt(style.fontSize)
          elements.push(parsed)
          break
        case 'mark':
          elements.push({ type: 'highlight', children: parseNode(el) })
          break
        default:
          // Recursively parse children for unknown elements
          elements.push(...parseNode(el))
      }
    }
  })

  return elements
}

/**
 * Parse table node
 */
function parseTableNode(table: HTMLElement): ParsedElement[] {
  const rows: ParsedElement[] = []
  const tableRows = table.querySelectorAll('tr')

  tableRows.forEach((tr) => {
    const cells: ParsedElement[] = []
    tr.querySelectorAll('th, td').forEach((cell) => {
      cells.push({
        type: cell.tagName.toLowerCase() === 'th' ? 'tableHeader' : 'tableCell',
        children: parseNode(cell),
      })
    })
    rows.push({ type: 'tableRow', children: cells })
  })

  return rows
}

/**
 * Get alignment from element style
 */
function getAlignment(el: HTMLElement): string {
  const style = el.style.textAlign || el.getAttribute('align')
  return style || 'left'
}

/**
 * Convert parsed elements to docx paragraphs
 */
function convertToDocxParagraphs(
  elements: ParsedElement[],
  options: { isList?: boolean; listLevel?: number; isQuote?: boolean } = {}
): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = []

  elements.forEach((element) => {
    switch (element.type) {
      case 'heading':
        paragraphs.push(
          new Paragraph({
            heading: element.level === 1 ? HeadingLevel.HEADING_1 : element.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            children: convertToTextRuns(element.children || []),
            spacing: { before: 400, after: 200 },
          })
        )
        break

      case 'paragraph':
        paragraphs.push(
          new Paragraph({
            children: convertToTextRuns(element.children || []),
            alignment: getDocxAlignment(element.align),
            indent: options.isQuote ? { left: convertInchesToTwip(0.5) } : undefined,
            spacing: { after: 200 },
          })
        )
        break

      case 'bulletList':
        element.children?.forEach((item, index) => {
          if (item.type === 'listItem') {
            paragraphs.push(
              new Paragraph({
                bullet: { level: options.listLevel || 0 },
                children: convertToTextRuns(item.children || []),
              })
            )
          }
        })
        break

      case 'orderedList':
        element.children?.forEach((item, index) => {
          if (item.type === 'listItem') {
            paragraphs.push(
              new Paragraph({
                numbering: { reference: 'default-numbering', level: options.listLevel || 0 },
                children: convertToTextRuns(item.children || []),
              })
            )
          }
        })
        break

      case 'blockquote':
        const quoteParagraphs = convertToDocxParagraphs(element.children || [], { isQuote: true })
        paragraphs.push(...quoteParagraphs)
        break

      case 'codeBlock':
        paragraphs.push(
          new Paragraph({
            shading: { fill: '1e293b' },
            children: [
              new TextRun({
                text: element.content || '',
                font: 'Consolas',
                size: 20,
                color: 'e2e8f0',
              }),
            ],
            spacing: { before: 200, after: 200 },
          })
        )
        break

      case 'table':
        const tableRows = element.children?.map((row) => {
          const cells = row.children?.map((cell) => {
            return new TableCell({
              children: convertToDocxParagraphs(cell.children || []),
              shading: cell.type === 'tableHeader' ? { fill: 'f8fafc' } : undefined,
            })
          }) || []
          return new TableRow({ children: cells })
        }) || []

        paragraphs.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        )
        break

      case 'horizontalRule':
        paragraphs.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'cccccc' } },
            spacing: { before: 200, after: 200 },
          })
        )
        break

      default:
        // Handle inline elements that might be at root level
        if (element.children?.length || element.content) {
          paragraphs.push(
            new Paragraph({
              children: convertToTextRuns([element]),
            })
          )
        }
    }
  })

  return paragraphs
}

/**
 * Convert parsed elements to text runs
 */
function convertToTextRuns(elements: ParsedElement[]): TextRun[] {
  const runs: TextRun[] = []

  elements.forEach((element) => {
    switch (element.type) {
      case 'text':
        runs.push(new TextRun({ text: element.content || '' }))
        break

      case 'bold':
        element.children?.forEach((child) => {
          if (child.type === 'text') {
            runs.push(new TextRun({ text: child.content || '', bold: true }))
          } else {
            runs.push(...convertToTextRuns([{ ...child, bold: true }]))
          }
        })
        break

      case 'italic':
        element.children?.forEach((child) => {
          if (child.type === 'text') {
            runs.push(new TextRun({ text: child.content || '', italics: true }))
          } else {
            runs.push(...convertToTextRuns([{ ...child, italic: true }]))
          }
        })
        break

      case 'underline':
        element.children?.forEach((child) => {
          if (child.type === 'text') {
            runs.push(new TextRun({ text: child.content || '', underline: {} }))
          } else {
            runs.push(...convertToTextRuns([{ ...child, underline: true }]))
          }
        })
        break

      case 'strike':
        element.children?.forEach((child) => {
          if (child.type === 'text') {
            runs.push(new TextRun({ text: child.content || '', strike: true }))
          } else {
            runs.push(...convertToTextRuns([{ ...child, strike: true }]))
          }
        })
        break

      case 'link':
        element.children?.forEach((child) => {
          if (child.type === 'text') {
            runs.push(
              new TextRun({
                text: child.content || '',
                color: '2563eb',
                underline: {},
              })
            )
          }
        })
        break

      case 'code':
        runs.push(
          new TextRun({
            text: element.content || '',
            font: 'Consolas',
            shading: { fill: 'f1f5f9' },
          })
        )
        break

      case 'highlight':
        element.children?.forEach((child) => {
          if (child.type === 'text') {
            runs.push(
              new TextRun({
                text: child.content || '',
                highlight: 'yellow',
              })
            )
          }
        })
        break

      case 'span':
        element.children?.forEach((child) => {
          if (child.type === 'text') {
            const runOptions: any = { text: child.content || '' }
            if (element.color) runOptions.color = element.color.replace('#', '')
            if (element.highlight) runOptions.highlight = 'yellow'
            if (element.fontSize) runOptions.size = element.fontSize * 2
            runs.push(new TextRun(runOptions))
          } else {
            runs.push(...convertToTextRuns([child]))
          }
        })
        break

      case 'break':
        runs.push(new TextRun({ break: 1 }))
        break

      default:
        if (element.children) {
          runs.push(...convertToTextRuns(element.children))
        }
    }
  })

  return runs
}

/**
 * Get docx alignment from string
 */
function getDocxAlignment(align?: string): typeof AlignmentType[keyof typeof AlignmentType] | undefined {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return AlignmentType.LEFT
  }
}

/**
 * Export HTML content to DOCX
 *
 * @param content - HTML string to export
 * @param options - Export options
 * @returns Promise that resolves when DOCX is downloaded
 */
export async function exportToDocx(
  content: string,
  options: ExportDocxOptions = {}
): Promise<void> {
  const {
    title = 'Treatment Plan',
    filename = 'treatment-plan.docx',
    author = 'ABA Therapy Platform',
    description = 'Generated treatment plan document',
  } = options

  // Parse HTML content
  const elements = parseHTML(content)

  // Convert to docx paragraphs
  const paragraphs = convertToDocxParagraphs(elements)

  // Create title paragraph
  const titleParagraph = new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 56,
      }),
    ],
    spacing: { after: 400 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 12,
        color: 'dddddd',
      },
    },
  })

  // Create document
  const doc = new Document({
    creator: author,
    title,
    description,
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 24, // 12pt
          },
          paragraph: {
            spacing: { line: 276 }, // 1.15 line spacing
          },
        },
        heading1: {
          run: {
            font: 'Calibri',
            size: 48, // 24pt
            bold: true,
            color: '1a1a1a',
          },
          paragraph: {
            spacing: { before: 480, after: 240 },
          },
        },
        heading2: {
          run: {
            font: 'Calibri',
            size: 40, // 20pt
            bold: true,
            color: '1a1a1a',
          },
          paragraph: {
            spacing: { before: 400, after: 200 },
          },
        },
        heading3: {
          run: {
            font: 'Calibri',
            size: 32, // 16pt
            bold: true,
            color: '333333',
          },
          paragraph: {
            spacing: { before: 320, after: 160 },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [titleParagraph, ...paragraphs],
      },
    ],
  })

  // Generate and download
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}
