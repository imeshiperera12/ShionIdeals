import jsPDF from "jspdf"
import "jspdf-autotable"
import * as XLSX from "xlsx"
import logoImage from "../images/logo.png"
import { AcroFormTextField } from "jspdf"

// Convert image to base64 when needed
const getLogoBase64 = async () => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = logoImage
  })
}

// Generate PDF Report with Logo
export const generatePDF = async (title, headers, data, summaryData = null) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  // Get logo
  let logoData
  try {
    logoData = await getLogoBase64()
  } catch (error) {
    console.error("Error loading logo:", error)
  }

  // Add logo in top right corner
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 250, 8, 30, 15)
    } catch (error) {
      console.error("Error adding logo to PDF:", error)
    }
  }

  // Add title
  doc.setFontSize(16)
  doc.text(title, 14, 15)

  // Add date
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)

  // Add summary if provided
  let startY = 28
  if (summaryData) {
    doc.setFontSize(10)
    doc.text("Summary:", 14, startY)
    startY += 5
    doc.setFontSize(8)
    Object.entries(summaryData).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, startY)
      startY += 4
    })
    startY += 3
  }

  doc.autoTable({
    startY: startY,
    head: [headers],
    body: data,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
      halign: "left",
      valign: "middle",
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    didDrawPage: (data) => {
      // Add logo on each page
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', 250, 8, 30, 15)
        } catch (error) {
          console.error("Error adding logo:", error)
        }
      }
      
      // Add page numbers
      const pageSize = doc.internal.pageSize
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageSize.getWidth() / 2, pageSize.getHeight() - 5, {
        align: "center",
      })
    },
  })

  doc.save(`${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`)
}

// Generate Excel Report
export const generateExcel = (title, headers, data, summaryData = null) => {
  const wb = XLSX.utils.book_new()
  const wsData = []

  wsData.push([title])
  wsData.push([`Generated: ${new Date().toLocaleString()}`])
  wsData.push([])

  if (summaryData) {
    wsData.push(["Summary:"])
    Object.entries(summaryData).forEach(([key, value]) => {
      wsData.push([key, value])
    })
    wsData.push([])
  }

  wsData.push(headers)
  data.forEach((row) => {
    wsData.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const colWidths = headers.map(() => 18)
  ws["!cols"] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, "Report")
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${Date.now()}.xlsx`)
}

// Generate Dashboard Full Report with Charts Data
export const generateDashboardReport = (dashboardData) => {
  const { balance, totalRevenue, totalSelling, totalBuying, totalExpenses, sellingProfit } = dashboardData

  const summaryData = {
    "Current Balance": `¥${balance.toLocaleString()}`,
    "Total Revenue": `¥${totalRevenue.toLocaleString()}`,
    "Total Selling Profit": `¥${sellingProfit.toLocaleString()}`,
    "Total Buying Amount": `¥${totalBuying.toLocaleString()}`,
    "Total Expenses": `¥${totalExpenses.toLocaleString()}`,
  }

  generatePDF("Admin Dashboard Report", ["Metric", "Value"], Object.entries(summaryData), null)
  generateExcel("Admin Dashboard Report", ["Metric", "Value"], Object.entries(summaryData), null)
}

// Generate Proforma Invoice for Selling
export const generateProformaInvoice = async (sellingData, buyingData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Get logo
  let logoData
  try {
    logoData = await getLogoBase64()
  } catch (error) {
    console.error("Error loading logo:", error)
  }

  // Header background
  doc.setFillColor(70, 70, 70)
  doc.rect(0, 0, pageWidth, 35, 'F')
  
  // Add logo with better size
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 15, 5, 50, 25)
    } catch (error) {
      console.error("Error adding logo:", error)
    }
  }

  // Company name section (right side) - NO RED BOX, just white text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('SHION IDEALS INTERNATIONAL', pageWidth - 82, 15)
  
  // Contact details
  doc.setFontSize(7)
  doc.setFont(undefined, 'normal')
  doc.text('+8175-1552-5087, +8180-8781-7319', pageWidth - 82, 19)
  doc.text('+11-9191-KFL BLDG, KUWANA SHI,', pageWidth - 82, 22)
  doc.text('TADO CHO-YUU-1233-2 1F', pageWidth - 82, 25)
  doc.text('shionidealsph@gmail.com', pageWidth - 82, 28)

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Invoice title
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text('PROFORMA INVOICE', 15, 45)

  // Invoice details box
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text(`Invoice Number: INV-${String(sellingData.invoiceNumber).padStart(3, '0')}`, pageWidth - 80, 45)
  doc.text(`Issue Date: ${sellingData.date}`, pageWidth - 80, 50)

  // Horizontal line
  doc.setDrawColor(0, 0, 0)
  doc.line(15, 52, pageWidth - 15, 52)

  // Billed to section
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text('Billed to:', 15, 60)
  
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text(`${sellingData.customerName}`, 15, 66)
  doc.text(`${sellingData.country}`, 15, 71)
  doc.text(`Email: ${sellingData.customerEmail}`, 15, 76)
  
  // Add fillable phone number field
  doc.text('Tel: ', 15, 81)
  const phoneField = new AcroFormTextField()
  phoneField.fieldName = "phoneNumber"
  phoneField.Rect = [28, 77, 50, 6]
  phoneField.value = "+XXX-XXX-XXXX"
  phoneField.maxLength = 20
  phoneField.fontSize = 9
  doc.addField(phoneField)

  // Due date
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  const dueDate = new Date(sellingData.date)
  dueDate.setDate(dueDate.getDate() + 30)
  const totalAmount = sellingData.sellingPrice || 0
  doc.text(`¥${totalAmount.toLocaleString()} JPY Due by ${dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 15, 92)

  // Add space before table
  const tableStartY = 102
  
  // Table headers
  doc.setFillColor(240, 240, 240)
  doc.rect(15, tableStartY, pageWidth - 30, 8, 'F')
  
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.text('Product', 20, tableStartY + 6)
  doc.text('HS Code', 80, tableStartY + 6)
  doc.text('Quantity', 115, tableStartY + 6)
  doc.text('Unit Price', 145, tableStartY + 6)
  doc.text('Total', 175, tableStartY + 6)

  // Table content with fillable HS Code field
  doc.setFont(undefined, 'normal')
  let rowY = tableStartY + 15
  const buyingInfo = buyingData || {}
  
  doc.text(buyingInfo.identifier || 'Product Details', 20, rowY)
  
  // Create fillable HS Code field
  const hsCodeField = new AcroFormTextField()
  hsCodeField.fieldName = "hsCode"
  hsCodeField.Rect = [76, rowY - 3.5, 30, 5]
  hsCodeField.value = "XXX"
  hsCodeField.fontSize = 9
  doc.addField(hsCodeField)
  
  doc.text('1', 115, rowY)
  doc.text(`¥${sellingData.sellingPrice?.toLocaleString() || '0'}`, 145, rowY)
  doc.text(`¥${sellingData.sellingPrice?.toLocaleString() || '0'}`, 175, rowY)

  // Add lines for table rows (start from row 2, not row 1)
  for (let i = 1; i < 10; i++) {
    const y = tableStartY + 13 + (i * 8)
    doc.line(15, y, pageWidth - 15, y)
  }

  // Vertical lines for table
  doc.line(15, tableStartY, 15, tableStartY + 93)
  doc.line(75, tableStartY, 75, tableStartY + 93)
  doc.line(110, tableStartY, 110, tableStartY + 93)
  doc.line(140, tableStartY, 140, tableStartY + 93)
  doc.line(170, tableStartY, 170, tableStartY + 93)
  doc.line(pageWidth - 15, tableStartY, pageWidth - 15, tableStartY + 93)

  // Total section
  const totalY = tableStartY + 95
  
  doc.setFont(undefined, 'bold')
  doc.text('Total (including tax)', 130, totalY)
  doc.text(`¥${totalAmount.toLocaleString()}`, 175, totalY)
  
  doc.line(15, totalY + 2, pageWidth - 15, totalY + 2)
  
  doc.setFontSize(11)
  doc.text('Amount Due', 130, totalY + 9)
  doc.text(`¥${totalAmount.toLocaleString()} JPY`, 165, totalY + 9)

  // Terms and Conditions box
  const termsY = totalY + 18
  
  // Left box - Payment terms with fillable fields
  doc.setFillColor(240, 240, 240)
  doc.rect(15, termsY, 90, 40, 'F')
  doc.setFontSize(8)
  doc.setFont(undefined, 'bold')
  doc.text('Particular', 20, termsY + 7)
  doc.text('Amount (JPY)', 62, termsY + 7)
  
  doc.setFont(undefined, 'normal')
  doc.text('Cost of goods', 20, termsY + 14)
  doc.text('Insurance', 20, termsY + 21)
  doc.text('Freight', 20, termsY + 28)
  doc.text('Total CIF Value', 20, termsY + 35)
  
  // Create fillable fields for amounts with placeholder "XXX"
  const costField = new AcroFormTextField()
  costField.fieldName = "costOfGoods"
  costField.Rect = [62, termsY + 10.5, 35, 5]
  costField.value = "XXX"
  costField.fontSize = 8
  doc.addField(costField)
  
  const insuranceField = new AcroFormTextField()
  insuranceField.fieldName = "insurance"
  insuranceField.Rect = [62, termsY + 17.5, 35, 5]
  insuranceField.value = "XXX"
  insuranceField.fontSize = 8
  doc.addField(insuranceField)
  
  const freightField = new AcroFormTextField()
  freightField.fieldName = "freight"
  freightField.Rect = [62, termsY + 24.5, 35, 5]
  freightField.value = "XXX"
  freightField.fontSize = 8
  doc.addField(freightField)
  
  const totalCIFField = new AcroFormTextField()
  totalCIFField.fieldName = "totalCIF"
  totalCIFField.Rect = [62, termsY + 31.5, 35, 5]
  totalCIFField.value = "XXX"
  totalCIFField.fontSize = 8
  doc.addField(totalCIFField)

  // Right box - Terms & Conditions (replacing black box)
  doc.setFillColor(240, 240, 240)
  doc.rect(110, termsY, pageWidth - 125, 40, 'F')
  doc.setFont(undefined, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text('Terms & Conditions', 115, termsY + 7)
  
  doc.setFont(undefined, 'normal')
  doc.setFontSize(7)
  doc.text('- Payment Terms:', 115, termsY + 13)
  doc.text('  100% Advance', 115, termsY + 17)
  doc.text('- Delivery Terms:', 115, termsY + 22)
  doc.text('  CIF Colombo', 115, termsY + 26)
  doc.text('- Insurance:', 115, termsY + 31)
  doc.text('  Included (up to CIF value)', 115, termsY + 35)

  // Footer
  doc.setFillColor(139, 0, 0)
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('www.shionideals.com', pageWidth / 2, pageHeight - 8, { align: 'center' })

  // Save PDF
  doc.save(`Proforma_Invoice_${sellingData.invoiceNumber}_${Date.now()}.pdf`)
}