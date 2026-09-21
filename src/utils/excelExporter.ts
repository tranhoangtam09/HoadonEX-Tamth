import ExcelJS from 'exceljs';
import { InvoiceItem } from '../types/invoice';
import { parseAmountNumber } from './validation';
import { sanitizePurpose } from './textParser';

export interface ExcelExportResult {
  filename: string;
  blob: Blob;
  count: number;
}

export async function exportInvoicesToExcel(
  items: InvoiceItem[],
  customFileName?: string
): Promise<ExcelExportResult> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Invoice Extractor V3';
  workbook.lastModifiedBy = 'Invoice Extractor V3';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = 'Bảng kê hóa đơn GN bù đắp';
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Title block
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'BẢNG KÊ HÓA ĐƠN GIẢI NGÂN BÙ ĐẮP';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0F2B59' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  worksheet.mergeCells('A2:M2');
  const subCell = worksheet.getCell('A2');
  const now = new Date();
  const dateString = `Ngày lập bảng kê: ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} • Số lượng hóa đơn: ${items.length}`;
  subCell.value = dateString;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Header row at row 3
  const headers = [
    { header: 'STT', key: 'stt', width: 6, col: 'A' },
    { header: 'Mã số thuế', key: 'tax_code', width: 16, col: 'B' },
    { header: 'Tên đơn vị phát hành', key: 'seller_name', width: 34, col: 'C' },
    { header: 'Ký hiệu mẫu số', key: 'template_symbol', width: 15, col: 'D' },
    { header: 'Ký hiệu hóa đơn', key: 'invoice_symbol', width: 16, col: 'E' },
    { header: 'Số hóa đơn/HĐ/ĐĐH', key: 'invoice_number', width: 18, col: 'F' },
    { header: 'Ngày hóa đơn', key: 'invoice_date', width: 14, col: 'G' },
    { header: 'Số tiền', key: 'invoice_amount', width: 18, col: 'H' },
    { header: 'Loại tiền', key: 'currency', width: 10, col: 'I' },
    { header: 'Mặt hàng / Mục đích', key: 'purpose', width: 32, col: 'J' },
    { header: 'Số tiền nhận nợ', key: 'debt_amount', width: 18, col: 'K' },
    { header: 'Ngày thanh toán', key: 'paid_date', width: 15, col: 'L' },
    { header: 'Số tiền đã thanh toán', key: 'paid_amount', width: 20, col: 'M' },
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.height = 28;

  headers.forEach((h, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = h.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F3567' }, // Deep Navy
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium', color: { argb: 'FF0B2244' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  };

  const startRowIndex = 4;

  // Insert data rows
  items.forEach((item, idx) => {
    const rowNum = startRowIndex + idx;
    const row = worksheet.getRow(rowNum);
    row.height = 24;

    const numAmount = parseAmountNumber(item.invoice_amount);
    const numDebt = parseAmountNumber(item.debt_amount || item.invoice_amount);
    const numPaid = parseAmountNumber(item.paid_amount || item.invoice_amount);

    const rowValues = [
      idx + 1, // A: STT
      item.tax_code || '', // B: MST (text format)
      item.seller_name || '', // C: Tên đơn vị
      item.template_symbol || '', // D: Ký hiệu mẫu
      item.invoice_symbol || '', // E: Ký hiệu HĐ
      item.invoice_number || '', // F: Số HĐ
      item.invoice_date || '', // G: Ngày HĐ
      numAmount !== '' ? numAmount : 0, // H: Số tiền
      item.currency || 'VND', // I: Loại tiền
      sanitizePurpose(item.purpose, item.seller_name, item.invoice_number), // J: Mặt hàng / Mục đích chi tiêu
      numDebt !== '' ? numDebt : 0, // K: Số tiền nhận nợ
      item.paid_date || item.invoice_date || '', // L: Ngày thanh toán
      numPaid !== '' ? numPaid : 0, // M: Số tiền đã thanh toán
    ];

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9.5 };
      cell.border = thinBorder;

      // Text formats
      if ([2, 4, 5, 6, 7, 12].includes(colIdx + 1)) {
        cell.numFmt = '@';
        cell.alignment = { horizontal: [2, 4, 5, 6, 7, 12].includes(colIdx + 1) ? 'center' : 'left', vertical: 'middle' };
      }
      // Currency amount formats
      else if ([8, 11, 13].includes(colIdx + 1)) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colIdx + 1 === 1 || colIdx + 1 === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Alternate row background
      if (idx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    });
  });

  const lastDataRow = startRowIndex + items.length - 1;
  const summaryRowIndex = lastDataRow + 1;
  const summaryRow = worksheet.getRow(summaryRowIndex);
  summaryRow.height = 28;

  // Merge A -> G for "TỔNG CỘNG"
  worksheet.mergeCells(`A${summaryRowIndex}:G${summaryRowIndex}`);
  const sumLabelCell = worksheet.getCell(`A${summaryRowIndex}`);
  sumLabelCell.value = 'TỔNG CỘNG';
  sumLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F2B59' } };
  sumLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sumLabelCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F4F8' },
  };

  // Borders for merged cells A..G
  for (let c = 1; c <= 7; c++) {
    const cell = summaryRow.getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F3567' } },
      bottom: { style: 'double', color: { argb: 'FF0F3567' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
  }

  // Column H (Total Invoice Amount)
  const sumH = summaryRow.getCell(8);
  sumH.value = items.length > 0 ? { formula: `SUM(H${startRowIndex}:H${lastDataRow})` } : 0;
  sumH.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F2B59' } };
  sumH.numFmt = '#,##0';
  sumH.alignment = { horizontal: 'right', vertical: 'middle' };
  sumH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  sumH.border = {
    top: { style: 'medium', color: { argb: 'FF0F3567' } },
    bottom: { style: 'double', color: { argb: 'FF0F3567' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Column I (Currency)
  const sumI = summaryRow.getCell(9);
  sumI.value = 'VND';
  sumI.font = { name: 'Arial', size: 9.5, bold: true };
  sumI.alignment = { horizontal: 'center', vertical: 'middle' };
  sumI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  sumI.border = {
    top: { style: 'medium', color: { argb: 'FF0F3567' } },
    bottom: { style: 'double', color: { argb: 'FF0F3567' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Column J (Purpose empty in total)
  const sumJ = summaryRow.getCell(10);
  sumJ.value = '';
  sumJ.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  sumJ.border = {
    top: { style: 'medium', color: { argb: 'FF0F3567' } },
    bottom: { style: 'double', color: { argb: 'FF0F3567' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Column K (Total Debt Amount)
  const sumK = summaryRow.getCell(11);
  sumK.value = items.length > 0 ? { formula: `SUM(K${startRowIndex}:K${lastDataRow})` } : 0;
  sumK.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F2B59' } };
  sumK.numFmt = '#,##0';
  sumK.alignment = { horizontal: 'right', vertical: 'middle' };
  sumK.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  sumK.border = {
    top: { style: 'medium', color: { argb: 'FF0F3567' } },
    bottom: { style: 'double', color: { argb: 'FF0F3567' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Column L (Empty in total)
  const sumL = summaryRow.getCell(12);
  sumL.value = '';
  sumL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  sumL.border = {
    top: { style: 'medium', color: { argb: 'FF0F3567' } },
    bottom: { style: 'double', color: { argb: 'FF0F3567' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Column M (Total Paid Amount)
  const sumM = summaryRow.getCell(13);
  sumM.value = items.length > 0 ? { formula: `SUM(M${startRowIndex}:M${lastDataRow})` } : 0;
  sumM.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F2B59' } };
  sumM.numFmt = '#,##0';
  sumM.alignment = { horizontal: 'right', vertical: 'middle' };
  sumM.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  sumM.border = {
    top: { style: 'medium', color: { argb: 'FF0F3567' } },
    bottom: { style: 'double', color: { argb: 'FF0F3567' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Column widths
  headers.forEach((h, i) => {
    worksheet.getColumn(i + 1).width = h.width;
  });

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const finalFilename = customFileName || `Bang_ke_hoa_don_bu_dap_${timestamp}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return {
    filename: finalFilename,
    blob,
    count: items.length,
  };
}
