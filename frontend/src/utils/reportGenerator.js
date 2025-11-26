import jsPDF from "jspdf"
import "jspdf-autotable"
import * as XLSX from "xlsx"

// Generate PDF Report
export const generatePDF = (title, headers, data, summaryData = null) => {
  // Use landscape orientation for better table fit
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

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
      // Add page numbers
      const pageSize = doc.internal.pageSize
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageSize.getWidth() / 2, pageSize.getHeight() - 5, {
        align: "center",
      })
    },
  })

  // Save the PDF
  doc.save(`${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`)
}

// Generate Excel Report
export const generateExcel = (title, headers, data, summaryData = null) => {
  const wb = XLSX.utils.book_new()

  const wsData = []

  // Add title
  wsData.push([title])
  wsData.push([`Generated: ${new Date().toLocaleString()}`])
  wsData.push([])

  // Add summary if provided
  if (summaryData) {
    wsData.push(["Summary:"])
    Object.entries(summaryData).forEach(([key, value]) => {
      wsData.push([key, value])
    })
    wsData.push([])
  }

  // Add headers and data
  wsData.push(headers)
  data.forEach((row) => {
    wsData.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const colWidths = headers.map(() => 18)
  ws["!cols"] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, "Report")

  // Save the Excel file
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

  // PDF Generation
  generatePDF("Admin Dashboard Report", ["Metric", "Value"], Object.entries(summaryData), null)

  // Excel Generation
  generateExcel("Admin Dashboard Report", ["Metric", "Value"], Object.entries(summaryData), null)
}
