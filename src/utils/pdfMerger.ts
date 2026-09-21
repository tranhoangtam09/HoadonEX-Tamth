import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { InvoiceItem } from '../types/invoice';

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
  const groups: InvoiceItem[][] = [];
  for (let i = 0; i < items.length; i += maxPerGroup) {
    groups.push(items.slice(i, i + maxPerGroup));
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

    coverPage.drawText(`So luong hoa don: ${groupItems.length} hoa don (Toi da 10 HD/nhom)`, {
      x: 40,
      y: height - 90,
      size: 11,
      font,
      color: rgb(0.85, 0.90, 0.98),
    });

    // Draw table of contents on cover page
    let yPos = height - 160;
    coverPage.drawText('DANH SACH HOA DON TRONG TAP:', {
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
      coverPage.drawText(String(idx + 1), { x: 40, y: yPos - 10, size: 9, font });
      coverPage.drawText(String(it.tax_code || '-').slice(0, 14), { x: 75, y: yPos - 10, size: 9, font });
      coverPage.drawText(String(it.invoice_number || '-').slice(0, 12), { x: 170, y: yPos - 10, size: 9, font });
      coverPage.drawText(String(it.invoice_date || '-'), { x: 250, y: yPos - 10, size: 9, font });

      const amtStr = it.invoice_amount ? Number(it.invoice_amount).toLocaleString('en-US') : '-';
      coverPage.drawText(amtStr, { x: 330, y: yPos - 10, size: 9, font: fontBold });
      coverPage.drawText(it.source_type, { x: 460, y: yPos - 10, size: 8, font });

      yPos -= 24;
    });

    // Now append each invoice page
    for (const item of groupItems) {
      let appended = false;
      if (item.file_blob && item.mime_type?.includes('pdf')) {
        try {
          const arrayBuffer = await item.file_blob.arrayBuffer();
          const sourcePdf = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
          copiedPages.forEach((page) => mergedDoc.addPage(page));
          appended = true;
        } catch {
          appended = false;
        }
      } else if (item.file_blob && item.mime_type?.startsWith('image/')) {
        try {
          const arrayBuffer = await item.file_blob.arrayBuffer();
          let imgEmbed;
          if (item.mime_type.includes('png')) {
            imgEmbed = await mergedDoc.embedPng(arrayBuffer);
          } else {
            imgEmbed = await mergedDoc.embedJpg(arrayBuffer);
          }

          const imgPage = mergedDoc.addPage([595.28, 841.89]);
          const pW = imgPage.getWidth() - 60;
          const pH = imgPage.getHeight() - 80;
          const imgDims = imgEmbed.scaleToFit(pW, pH);

          imgPage.drawText(`Hoa don so: ${item.invoice_number || '-'} • MST: ${item.tax_code || '-'}`, {
            x: 30,
            y: imgPage.getHeight() - 30,
            size: 10,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.3),
          });

          imgPage.drawImage(imgEmbed, {
            x: 30,
            y: imgPage.getHeight() - 50 - imgDims.height,
            width: imgDims.width,
            height: imgDims.height,
          });
          appended = true;
        } catch {
          appended = false;
        }
      }

      // If XML or fallback text, generate a clean summary invoice page
      if (!appended) {
        const docPage = mergedDoc.addPage([595.28, 841.89]);
        const pHeight = docPage.getHeight();

        docPage.drawRectangle({
          x: 30,
          y: pHeight - 750,
          width: 535,
          height: 720,
          borderColor: rgb(0.8, 0.85, 0.9),
          borderWidth: 1,
          color: rgb(0.98, 0.99, 1),
        });

        docPage.drawText('CHUNG TU HOA DON DIEN TU', {
          x: 50,
          y: pHeight - 70,
          size: 14,
          font: fontBold,
          color: rgb(0.06, 0.21, 0.40),
        });

        docPage.drawText(`Nguon du lieu: ${item.source_type} • File goc: ${item.source_file}`, {
          x: 50,
          y: pHeight - 90,
          size: 9,
          font,
          color: rgb(0.4, 0.45, 0.5),
        });

        let curY = pHeight - 130;
        const details = [
          ['Don vi phat hanh:', item.seller_name || '-'],
          ['Ma so thue (MST):', item.tax_code || '-'],
          ['Ky hieu mau so:', item.template_symbol || '-'],
          ['Ky hieu hoa don:', item.invoice_symbol || '-'],
          ['So hoa don:', item.invoice_number || '-'],
          ['Ngay lap hoa don:', item.invoice_date || '-'],
          ['Tong tien thanh toan:', `${Number(item.invoice_amount || 0).toLocaleString('en-US')} ${item.currency || 'VND'}`],
          ['Mat hang / Muc dich:', item.purpose || '-'],
          ['So tien nhan no:', `${Number(item.debt_amount || item.invoice_amount || 0).toLocaleString('en-US')} ${item.currency || 'VND'}`],
          ['Ngay thanh toan:', item.paid_date || item.invoice_date || '-'],
          ['So tien da thanh toan:', `${Number(item.paid_amount || item.invoice_amount || 0).toLocaleString('en-US')} ${item.currency || 'VND'}`],
        ];

        details.forEach(([lbl, val]) => {
          docPage.drawText(lbl, { x: 50, y: curY, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
          docPage.drawText(String(val).slice(0, 75), { x: 180, y: curY, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
          curY -= 28;
        });

        if (item._raw_text) {
          curY -= 15;
          docPage.drawText('Trich doan du lieu goc:', { x: 50, y: curY, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
          curY -= 15;
          const snippet = item._raw_text.slice(0, 350).replace(/[\r\n]+/g, ' ');
          docPage.drawText(snippet.slice(0, 95), { x: 50, y: curY, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
          curY -= 12;
          docPage.drawText(snippet.slice(95, 190), { x: 50, y: curY, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
          curY -= 12;
          docPage.drawText(snippet.slice(190, 285), { x: 50, y: curY, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
        }
      }
    }

    const pdfBytes = await mergedDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);

    results.push({
      groupIndex: gIdx + 1,
      filename,
      invoiceCount: groupItems.length,
      blob,
      downloadUrl,
    });
  }

  return results;
}
