import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { InvoiceItem } from '../types/invoice';
import { sortInvoicesByDate } from './validation';

export interface MergedPdfResult {
  groupIndex: number;
  filename: string;
  invoiceCount: number;
  blob: Blob;
  downloadUrl: string;
}

export async function mergeInvoicesToPdfGroups(
  items: InvoiceItem[],
  maxPerGroup = 10
): Promise<MergedPdfResult[]> {
  // Sắp xếp hóa đơn theo đúng thứ tự ngày trên hóa đơn để đồng bộ với Excel
  const sortedItems = sortInvoicesByDate(items, 'asc');

  const groups: InvoiceItem[][] = [];
  for (let i = 0; i < sortedItems.length; i += maxPerGroup) {
    groups.push(sortedItems.slice(i, i + maxPerGroup));
  }

  const results: MergedPdfResult[] = [];

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const groupItems = groups[gIdx];
    const groupNum = String(gIdx + 1).padStart(2, '0');
    const filename = `HOA_DON_GOP_${groupNum}.pdf`;

    const mergedDoc = await PDFDocument.create();
    const font = await mergedDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

    // Group cover page
    const coverPage = mergedDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = coverPage.getSize();

    // Draw header banner
    coverPage.drawRectangle({
      x: 0,
      y: height - 120,
      width: width,
      height: 120,
      color: rgb(0.06, 0.21, 0.40),
    });

    coverPage.drawText(`TAP HOA DON GIAI NGAN BU DAP - NHOM ${groupNum}`, {
      x: 40,
      y: height - 60,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    coverPage.drawText(`So luong hoa don: ${groupItems.length} hoa don (Toi da 10 HD/nhom theo thu tu ngay)`, {
      x: 40,
      y: height - 90,
      size: 11,
      font,
      color: rgb(0.85, 0.90, 0.98),
    });

    // Draw table of contents on cover page
    let yPos = height - 160;
    coverPage.drawText('DANH SACH HOA DON TRONG TAP (SAP XEP THEO NGAY):', {
      x: 40,
      y: yPos,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    yPos -= 25;

    // Header line
    coverPage.drawText('STT', { x: 40, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    coverPage.drawText('MST', { x: 75, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    coverPage.drawText('SO HD', { x: 170, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    coverPage.drawText('NGAY', { x: 250, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    coverPage.drawText('SO TIEN (VND)', { x: 330, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    coverPage.drawText('NGUON', { x: 460, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    yPos -= 15;

    coverPage.drawLine({
      start: { x: 40, y: yPos + 5 },
      end: { x: width - 40, y: yPos + 5 },
      thickness: 1,
      color: rgb(0.8, 0.85, 0.9),
    });

    groupItems.forEach((it, idx) => {
      coverPage.drawText(String(gIdx * maxPerGroup + idx + 1), { x: 40, y: yPos - 10, size: 9, font });
      coverPage.drawText(String(it.tax_code || '-').slice(0, 14), { x: 75, y: yPos - 10, size: 9, font });
      coverPage.drawText(String(it.invoice_number || '-').slice(0, 12), { x: 170, y: yPos - 10, size: 9, font });
      coverPage.drawText(String(it.invoice_date || '-'), { x: 250, y: yPos - 10, size: 9, font });

      const amtStr = it.invoice_amount ? Number(it.invoice_amount).toLocaleString('en-US') : '-';
      coverPage.drawText(amtStr, { x: 330, y: yPos - 10, size: 9, font: fontBold });
      coverPage.drawText(it.source_type, { x: 460, y: yPos - 10, size: 8, font });

      yPos -= 24;
    });

    // Append pages from files if available
    for (const it of groupItems) {
      try {
        if (it.file_blob && it.mime_type?.includes('pdf')) {
          const arrayBuffer = await it.file_blob.arrayBuffer();
          const subDoc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedDoc.copyPages(subDoc, subDoc.getPageIndices());
          copiedPages.forEach((page) => mergedDoc.addPage(page));
        } else if (it.file_blob && it.mime_type?.startsWith('image/')) {
          const arrayBuffer = await it.file_blob.arrayBuffer();
          let embeddedImg;
          if (it.mime_type.includes('png')) {
            embeddedImg = await mergedDoc.embedPng(arrayBuffer);
          } else {
            embeddedImg = await mergedDoc.embedJpg(arrayBuffer);
          }
          const page = mergedDoc.addPage([595.28, 841.89]);
          const imgDims = embeddedImg.scaleToFit(500, 750);
          page.drawImage(embeddedImg, {
            x: 50,
            y: 841.89 - 50 - imgDims.height,
            width: imgDims.width,
            height: imgDims.height,
          });
        }
      } catch (e) {
        console.warn('Could not merge document page:', it.source_file, e);
      }
    }

    const pdfBytes = await mergedDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);

    results.push({
      groupIndex: gIdx,
      filename,
      invoiceCount: groupItems.length,
      blob,
      downloadUrl,
    });
  }

  return results;
}
