'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface ExportPDFOptions {
  title?: string
  filename?: string
  margin?: number
  pageSize?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
}

/**
 * Export HTML content to PDF
 *
 * @param content - HTML string to export
 * @param options - Export options
 * @returns Promise that resolves when PDF is downloaded
 */
export async function exportToPDF(
  content: string,
  options: ExportPDFOptions = {}
): Promise<void> {
  const {
    title = 'Treatment Plan',
    filename = 'treatment-plan.pdf',
    margin = 20,
    pageSize = 'a4',
    orientation = 'portrait',
  } = options

  // Create a temporary container for rendering
  const container = document.createElement('div')
  container.innerHTML = content
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 800px;
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
    background: white;
  `

  // Apply styling for better PDF output
  const style = document.createElement('style')
  style.textContent = `
    h1 { font-size: 24px; font-weight: bold; margin: 24px 0 16px; color: #1a1a1a; }
    h2 { font-size: 20px; font-weight: 600; margin: 20px 0 12px; color: #1a1a1a; }
    h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: #333; }
    p { margin: 8px 0; }
    ul, ol { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f8f9fa; font-weight: 600; }
    blockquote { border-left: 4px solid #ddd; margin: 16px 0; padding-left: 16px; color: #666; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    img { max-width: 100%; height: auto; }
    a { color: #2563eb; text-decoration: underline; }
  `
  container.appendChild(style)
  document.body.appendChild(container)

  try {
    // Add title if provided
    if (title) {
      const titleEl = document.createElement('h1')
      titleEl.textContent = title
      titleEl.style.cssText = 'font-size: 28px; font-weight: bold; margin-bottom: 24px; color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 12px;'
      container.insertBefore(titleEl, container.firstChild)
    }

    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    // Calculate dimensions
    const imgWidth = pageSize === 'a4' ? 210 : 216 // mm (A4 or Letter width)
    const pageHeight = pageSize === 'a4' ? 297 : 279 // mm (A4 or Letter height)
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    })

    // Add image to PDF, handling multiple pages if needed
    let heightLeft = imgHeight
    let position = 0
    const contentWidth = imgWidth - 2 * margin
    const contentHeight = (canvas.height * contentWidth) / canvas.width

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      margin,
      margin,
      contentWidth,
      contentHeight
    )
    heightLeft -= pageHeight - 2 * margin

    // Add additional pages if content exceeds one page
    while (heightLeft > 0) {
      position -= pageHeight - 2 * margin
      pdf.addPage()
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        position + margin,
        contentWidth,
        contentHeight
      )
      heightLeft -= pageHeight - 2 * margin
    }

    // Add footer with timestamp
    const totalPages = pdf.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
        imgWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    // Download PDF
    pdf.save(filename)
  } finally {
    // Clean up
    document.body.removeChild(container)
  }
}

/**
 * Export editor element directly to PDF (for more accurate rendering)
 *
 * @param element - DOM element to export
 * @param options - Export options
 */
export async function exportElementToPDF(
  element: HTMLElement,
  options: ExportPDFOptions = {}
): Promise<void> {
  const {
    title = 'Treatment Plan',
    filename = 'treatment-plan.pdf',
    margin = 20,
    pageSize = 'a4',
    orientation = 'portrait',
  } = options

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.cssText = `
    width: 800px;
    padding: 20px;
    background: white;
  `

  // Create a wrapper for export
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    background: white;
  `

  // Add title
  if (title) {
    const titleEl = document.createElement('h1')
    titleEl.textContent = title
    titleEl.style.cssText = 'font-size: 28px; font-weight: bold; margin-bottom: 24px; color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 12px;'
    wrapper.appendChild(titleEl)
  }

  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgWidth = pageSize === 'a4' ? 210 : 216
    const pageHeight = pageSize === 'a4' ? 297 : 279
    const contentWidth = imgWidth - 2 * margin
    const contentHeight = (canvas.height * contentWidth) / canvas.width

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    })

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      margin,
      margin,
      contentWidth,
      contentHeight
    )

    // Handle multiple pages
    let heightLeft = contentHeight - (pageHeight - 2 * margin)
    let position = margin

    while (heightLeft > 0) {
      position = margin - (pageHeight - 2 * margin)
      pdf.addPage()
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        position,
        contentWidth,
        contentHeight
      )
      heightLeft -= pageHeight - 2 * margin
    }

    // Add page numbers
    const totalPages = pdf.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text(
        `Page ${i} of ${totalPages}`,
        imgWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    pdf.save(filename)
  } finally {
    document.body.removeChild(wrapper)
  }
}
