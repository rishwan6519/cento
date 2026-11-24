const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // emoji range
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport & map
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // variation selectors
    .replace(/[^\x20-\x7E\t\r\n]/g, c => {
      if (c === '“' || c === '”') return '"';
      if (c === '‘' || c === '’') return "'";
      if (c === '—' || c === '–') return '-';
      if (c === '•') return '*';
      if (c === '…') return '...';
      if (c === '≤') return '<=';
      if (c === '≥') return '>=';
      if (c === '≠') return '!=';
      if (c === '→') return '->';
      return '';
    });
}

// Helper to wrap text based on font and max width
function wrapText(text, font, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word && currentLine === '') continue;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    let testWidth = 0;
    try {
      testWidth = font.widthOfTextAtSize(testLine, size);
    } catch (e) {
      testWidth = testLine.length * size * 0.55;
    }

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      // If single word exceeds maxWidth, break it
      let singleWordWidth = 0;
      try {
        singleWordWidth = font.widthOfTextAtSize(word, size);
      } catch (e) {
        singleWordWidth = word.length * size * 0.55;
      }
      if (singleWordWidth > maxWidth) {
        let chunk = '';
        for (let char of word) {
          if (font.widthOfTextAtSize(chunk + char, size) <= maxWidth) {
            chunk += char;
          } else {
            lines.push(chunk);
            chunk = char;
          }
        }
        currentLine = chunk;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

async function convertMarkdownGuideToPdf() {
  const guidePath = path.join(__dirname, '..', 'STORE_SPARC_OPS_API_GUIDE.md');
  const rawContent = fs.readFileSync(guidePath, 'utf8');

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89; // A4
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNumber = 1;
  const totalPagesEstimate = 35;

  function drawHeader() {
    currentPage.drawText('STORE SPARC OPS — COMPLETE API SPECIFICATION & CONTRACT GUIDE', {
      x: margin,
      y: pageHeight - 32,
      size: 7.5,
      font: helveticaBold,
      color: rgb(0.2, 0.35, 0.6),
    });
    currentPage.drawLine({
      start: { x: margin, y: pageHeight - 38 },
      end: { x: pageWidth - margin, y: pageHeight - 38 },
      thickness: 0.5,
      color: rgb(0.8, 0.85, 0.9),
    });
  }

  function drawFooter() {
    currentPage.drawLine({
      start: { x: margin, y: margin + 22 },
      end: { x: pageWidth - margin, y: margin + 22 },
      thickness: 0.5,
      color: rgb(0.8, 0.85, 0.9),
    });
    currentPage.drawText('Centelon IT Solutions LLP | Store Sparc Ops Enterprise Backend v1.0', {
      x: margin,
      y: margin + 10,
      size: 7.5,
      font: helvetica,
      color: rgb(0.45, 0.45, 0.45),
    });
    currentPage.drawText(`Page ${pageNumber}`, {
      x: pageWidth - margin - 40,
      y: margin + 10,
      size: 8,
      font: helveticaBold,
      color: rgb(0.2, 0.35, 0.6),
    });
  }

  function newPage() {
    drawFooter();
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    pageNumber++;
    y = pageHeight - margin - 15;
    drawHeader();
  }

  function ensureSpace(needed) {
    if (y - needed < margin + 35) {
      newPage();
    }
  }

  // Cover / Header banner on Page 1
  currentPage.drawRectangle({
    x: 0,
    y: pageHeight - 160,
    width: pageWidth,
    height: 160,
    color: rgb(0.08, 0.2, 0.42),
  });

  currentPage.drawText('STORE SPARC OPS PLATFORM', {
    x: margin,
    y: pageHeight - 65,
    size: 24,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  currentPage.drawText('Complete API Contract & Field Specification Guide', {
    x: margin,
    y: pageHeight - 95,
    size: 13,
    font: helvetica,
    color: rgb(0.85, 0.92, 1),
  });

  currentPage.drawText('Authoritative Backend Reference: Staff APIs (001-014), Manager APIs & Q&A', {
    x: margin,
    y: pageHeight - 120,
    size: 9.5,
    font: helveticaOblique,
    color: rgb(0.7, 0.8, 0.95),
  });

  currentPage.drawText('Centelon IT Solutions LLP | Production & Staging Environment Contract', {
    x: margin,
    y: pageHeight - 140,
    size: 8.5,
    font: helvetica,
    color: rgb(0.6, 0.75, 0.9),
  });

  y = pageHeight - 185;

  // Split markdown into lines
  const rawLines = rawContent.split(/\r?\n/);
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = '';

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const line = sanitizeText(rawLine);

    // Code block detection
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block, render buffer
        inCodeBlock = false;
        renderCodeBlock(codeBuffer, codeLang);
        codeBuffer = [];
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      y -= 6;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      ensureSpace(16);
      y -= 6;
      currentPage.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: rgb(0.75, 0.8, 0.88),
      });
      y -= 10;
      continue;
    }

    // Heading 1 (# ...)
    if (line.startsWith('# ')) {
      const heading = line.replace(/^#\s+/, '').trim();
      ensureSpace(45);
      y -= 12;
      currentPage.drawRectangle({
        x: margin,
        y: y - 5,
        width: contentWidth,
        height: 24,
        color: rgb(0.9, 0.94, 0.99),
      });
      currentPage.drawRectangle({
        x: margin,
        y: y - 5,
        width: 4,
        height: 24,
        color: rgb(0.08, 0.25, 0.55),
      });
      currentPage.drawText(heading, {
        x: margin + 12,
        y: y + 2,
        size: 13,
        font: helveticaBold,
        color: rgb(0.08, 0.22, 0.45),
      });
      y -= 22;
      continue;
    }

    // Heading 2 (## ...)
    if (line.startsWith('## ')) {
      const heading = line.replace(/^##\s+/, '').trim();
      ensureSpace(35);
      y -= 10;
      currentPage.drawText(heading, {
        x: margin,
        y,
        size: 12,
        font: helveticaBold,
        color: rgb(0.12, 0.28, 0.52),
      });
      currentPage.drawLine({
        start: { x: margin, y: y - 4 },
        end: { x: margin + Math.min(contentWidth, 380), y: y - 4 },
        thickness: 1,
        color: rgb(0.2, 0.45, 0.75),
      });
      y -= 16;
      continue;
    }

    // Heading 3 (### ...)
    if (line.startsWith('### ')) {
      const heading = line.replace(/^###\s+/, '').trim();
      ensureSpace(28);
      y -= 8;
      currentPage.drawText(heading, {
        x: margin,
        y,
        size: 10.5,
        font: helveticaBold,
        color: rgb(0.15, 0.35, 0.55),
      });
      y -= 14;
      continue;
    }

    // Heading 4 (#### ...)
    if (line.startsWith('#### ')) {
      const heading = line.replace(/^####\s+/, '').trim();
      ensureSpace(22);
      y -= 6;
      currentPage.drawText(heading, {
        x: margin,
        y,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.25, 0.35, 0.45),
      });
      y -= 12;
      continue;
    }

    // Blockquote (> ...)
    if (line.startsWith('> ')) {
      const bqText = line.replace(/^>\s+/, '').trim();
      const wrapped = wrapText(bqText, helveticaOblique, 8.5, contentWidth - 25);
      const bqHeight = wrapped.length * 12 + 8;
      ensureSpace(bqHeight + 6);

      currentPage.drawRectangle({
        x: margin,
        y: y - bqHeight + 4,
        width: contentWidth,
        height: bqHeight,
        color: rgb(0.95, 0.97, 1.0),
      });
      currentPage.drawRectangle({
        x: margin,
        y: y - bqHeight + 4,
        width: 3,
        height: bqHeight,
        color: rgb(0.2, 0.45, 0.75),
      });

      let lineY = y - 8;
      for (const wLine of wrapped) {
        currentPage.drawText(wLine, {
          x: margin + 12,
          y: lineY,
          size: 8.5,
          font: helveticaOblique,
          color: rgb(0.2, 0.25, 0.35),
        });
        lineY -= 12;
      }
      y -= bqHeight + 4;
      continue;
    }

    // Bullet or Numbered List (* ..., - ..., 1. ...)
    const listMatch = line.match(/^(\s*)([*+-]|\d+\.)\s+(.*)/);
    if (listMatch) {
      const indentLevel = Math.floor(listMatch[1].length / 2);
      const bulletSymbol = listMatch[2].match(/\d+\./) ? listMatch[2] : '-';
      const bulletText = listMatch[3];
      const indentOffset = indentLevel * 12 + 10;
      const textWidth = contentWidth - indentOffset - 12;

      const wrapped = wrapText(bulletText, helvetica, 8.5, textWidth);
      const blockHeight = wrapped.length * 11.5 + 4;
      ensureSpace(blockHeight);

      currentPage.drawText(bulletSymbol, {
        x: margin + indentOffset,
        y,
        size: 8.5,
        font: helveticaBold,
        color: rgb(0.18, 0.38, 0.65),
      });

      let lineY = y;
      for (let i = 0; i < wrapped.length; i++) {
        currentPage.drawText(wrapped[i], {
          x: margin + indentOffset + 14,
          y: lineY,
          size: 8.5,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15),
        });
        lineY -= 11.5;
      }
      y = lineY - 2;
      continue;
    }

    // Table rows (| ... |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cells.some(c => c.match(/^:?---+:?$/))) {
        // Table separator row, skip
        continue;
      }
      const colWidth = contentWidth / cells.length;
      ensureSpace(16);

      let cellX = margin;
      for (const cell of cells) {
        const truncated = cell.length > 25 ? cell.substring(0, 23) + '..' : cell;
        currentPage.drawText(truncated, {
          x: cellX + 4,
          y,
          size: 8,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });
        cellX += colWidth;
      }
      currentPage.drawLine({
        start: { x: margin, y: y - 3 },
        end: { x: pageWidth - margin, y: y - 3 },
        thickness: 0.3,
        color: rgb(0.85, 0.85, 0.9),
      });
      y -= 13;
      continue;
    }

    // Standard Paragraph text
    const wrapped = wrapText(line, helvetica, 8.5, contentWidth);
    const blockHeight = wrapped.length * 11.5 + 3;
    ensureSpace(blockHeight);

    for (const wLine of wrapped) {
      currentPage.drawText(wLine, {
        x: margin,
        y,
        size: 8.5,
        font: helvetica,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= 11.5;
    }
    y -= 2;
  }

  function renderCodeBlock(lines, lang) {
    if (!lines || lines.length === 0) return;

    // Filter out huge chunks if any, wrap long code lines
    const formattedLines = [];
    for (const rawCode of lines) {
      if (rawCode.length <= 80) {
        formattedLines.push(rawCode);
      } else {
        // Split code line
        let remainder = rawCode;
        while (remainder.length > 80) {
          formattedLines.push(remainder.substring(0, 80));
          remainder = remainder.substring(80);
        }
        if (remainder) formattedLines.push(remainder);
      }
    }

    // Render lines in blocks that fit on pages
    let lineIdx = 0;
    while (lineIdx < formattedLines.length) {
      const remainingHeight = y - margin - 35;
      const linesPerPage = Math.max(3, Math.floor((remainingHeight - 16) / 10));
      const chunk = formattedLines.slice(lineIdx, lineIdx + linesPerPage);
      const chunkHeight = chunk.length * 10 + 12;

      ensureSpace(Math.min(chunkHeight + 8, 120));

      // Draw background
      currentPage.drawRectangle({
        x: margin,
        y: y - chunkHeight + 4,
        width: contentWidth,
        height: chunkHeight,
        color: rgb(0.96, 0.97, 0.98),
      });

      currentPage.drawRectangle({
        x: margin,
        y: y - chunkHeight + 4,
        width: contentWidth,
        height: chunkHeight,
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 0.5,
      });

      let codeY = y - 7;
      for (const codeLine of chunk) {
        currentPage.drawText(codeLine, {
          x: margin + 8,
          y: codeY,
          size: 7.5,
          font: courier,
          color: rgb(0.1, 0.18, 0.28),
        });
        codeY -= 10;
      }

      y -= chunkHeight + 4;
      lineIdx += chunk.length;
      if (lineIdx < formattedLines.length) {
        newPage();
      }
    }
    y -= 4;
  }

  // Draw footer on the last page
  drawFooter();

  // Save to workspace root
  const outputPath = path.join(__dirname, '..', 'STORE_SPARC_OPS_API_GUIDE.pdf');
  const pdfBytes = await pdfDoc.save();
  try {
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`Generated PDF at ${outputPath} (${pdfBytes.length} bytes, ${pdfDoc.getPageCount()} pages)`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`File ${outputPath} is currently opened by user. Writing to STORE_SPARC_OPS_API_GUIDE_v2.pdf`);
      const altPath = path.join(__dirname, '..', 'STORE_SPARC_OPS_API_GUIDE_v2.pdf');
      fs.writeFileSync(altPath, pdfBytes);
      console.log(`Saved alternate copy at ${altPath}`);
    } else {
      throw err;
    }
  }

  // Save to artifact directory
  const artifactDir = 'C:\\Users\\krishwan\\.gemini\\antigravity\\brain\\80084802-adb1-4c8d-b215-1a923062ef64';
  if (fs.existsSync(artifactDir)) {
    try {
      const artifactPath = path.join(artifactDir, 'STORE_SPARC_OPS_API_GUIDE.pdf');
      fs.writeFileSync(artifactPath, pdfBytes);
      console.log(`Saved copy to artifact directory at ${artifactPath}`);
    } catch (aErr) {
      console.warn('Artifact write warning:', aErr.message);
    }
  }
}

convertMarkdownGuideToPdf().catch(err => {
  console.error('Failed to convert markdown guide to PDF:', err);
  process.exit(1);
});

