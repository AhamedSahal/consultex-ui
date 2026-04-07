import {
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
} from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ---------------------------------------------------------------------------
// Markdown parser helpers
// ---------------------------------------------------------------------------

function parseMarkdown(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    if (/^[\-\*\+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\-\*\+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*\+]\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'bullet', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'numbered', items });
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    blocks.push({ type: 'paragraph', text: line.trim() });
    i++;
  }

  return blocks;
}

function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1');
}

function inlineRuns(text, baseOptions = {}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) return new TextRun({ text: boldMatch[1], bold: true, ...baseOptions });
    return new TextRun({ text: stripInline(part), ...baseOptions });
  });
}

function renderInlineHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

// ---------------------------------------------------------------------------
// Logo fetching helpers
// ---------------------------------------------------------------------------

async function fetchLogoAsNormalizedPng(url, maxW = 110, maxH = 60, borderRadius = 8) {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const w = Math.max(1, Math.round(img.naturalWidth * ratio));
        const h = Math.max(1, Math.round(img.naturalHeight * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // Clip to rounded rectangle before drawing so the PNG itself has rounded corners
        const cw = canvas.width;
        const ch = canvas.height;
        const r = Math.round((borderRadius / Math.min(w, h)) * Math.min(cw, ch));
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(cw - r, 0);
        ctx.quadraticCurveTo(cw, 0, cw, r);
        ctx.lineTo(cw, ch - r);
        ctx.quadraticCurveTo(cw, ch, cw - r, ch);
        ctx.lineTo(r, ch);
        ctx.quadraticCurveTo(0, ch, 0, ch - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        resolve({ pngUint8Array: bytes, dataUrl, width: w, height: h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url.includes('?') ? url : `${url}?_cb=${Date.now()}`;
  });
}

// ---------------------------------------------------------------------------
// Key-value pair parser (for JOB INFORMATION section)
// ---------------------------------------------------------------------------

/**
 * Extract key-value pairs from content blocks.
 * Handles formats like:
 *   **Job Title:** HR Manager | **Reports To:** TBD
 *   **Job Title:** HR Manager  (one per line/paragraph)
 *   Job Title: HR Manager
 */
function parseKeyValuePairs(blocks) {
  const pairs = [];

  for (const block of blocks) {
    let texts = [];
    if (block.type === 'paragraph') texts = [block.text];
    else if (block.type === 'bullet') texts = block.items;

    for (const text of texts) {
      // Split by pipe separators first, then parse each chunk
      const chunks = text.split(/\s*\|\s*/).map((c) => c.trim()).filter(Boolean);

      // Handle 2-col table rows: ["**Label:**", "Value"] or 4-col: ["**L1:**", "V1", "**L2:**", "V2"]
      // In these formats the label and value are in adjacent chunks — detect and pair them directly.
      const isCellLabel = (s) => {
        const clean = s.replace(/\*\*/g, '').trim();
        // A cell label ends with a colon and has no value content after it
        return clean.endsWith(':') && clean.replace(/:$/, '').trim().length > 0;
      };

      let i = 0;
      let usedCellPairing = false;
      while (i < chunks.length - 1) {
        if (isCellLabel(chunks[i])) {
          const key = chunks[i].replace(/\*\*/g, '').replace(/:$/, '').trim();
          const value = chunks[i + 1].replace(/\*\*/g, '').trim();
          // Skip separator rows like "---"
          if (key && !/^[-|]+$/.test(value)) {
            pairs.push({ key, value: value || 'TBD' });
            usedCellPairing = true;
          }
          i += 2; // consume both label and value chunks
        } else {
          i++;
        }
      }

      // Fall back to colon-in-chunk parsing when no cell pairing was found
      if (!usedCellPairing) {
        for (const chunk of chunks) {
          const clean = chunk.replace(/\*\*/g, '').trim();
          const colonIdx = clean.indexOf(':');
          if (colonIdx > 0 && colonIdx < 50) {
            const key = clean.substring(0, colonIdx).trim();
            const value = clean.substring(colonIdx + 1).trim();
            if (key) pairs.push({ key, value: value || 'TBD' });
          }
        }
      }
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Word (.docx) constants & helpers
// ---------------------------------------------------------------------------

const DEFAULT_SECTION_BG = '193d6d';

/**
 * Detect whether a section title refers to the "Job Information" section.
 * Uses compact matching (strips non-alphanumeric) to handle template titles
 * like "1. JOBDetails" as well as the default "1. JOB INFORMATION".
 */
function isJobInfoSection(title) {
  if (!title) return false;
  const lower   = stripInline(title).toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, '');
  const patterns = ['job information', 'job info', 'job detail'];
  return patterns.some((p) => {
    const cp = p.replace(/[^a-z0-9]/g, '');
    return lower.includes(p) || compact.includes(cp);
  });
}

/**
 * Detect whether a section title refers to the "Approved By" section.
 */
function isApprovalsSection(title) {
  if (!title) return false;
  const lower = stripInline(title).toLowerCase();
  return lower.includes('approv') || lower.includes('approved by');
}

const COLORS = {
  sectionBg: DEFAULT_SECTION_BG,
  sectionText: 'FFFFFF',
  accent: '2E75B6',
  titleColor: '1F3864',
  black: '000000',
  gray: '595959',
};

function getSectionBg(templateTheme) {
  const color = templateTheme?.primaryColor;
  if (!color) return DEFAULT_SECTION_BG;
  return color.replace(/^#/, '').toUpperCase();
}

const accentBorder = {
  top: { style: BorderStyle.SINGLE, color: '2E75B6', size: 4 },
  bottom: { style: BorderStyle.SINGLE, color: '2E75B6', size: 4 },
  left: { style: BorderStyle.SINGLE, color: '2E75B6', size: 4 },
  right: { style: BorderStyle.SINGLE, color: '2E75B6', size: 4 },
};

function makeSectionBorder(sectionBg) {
  return {
    top: { style: BorderStyle.SINGLE, color: sectionBg, size: 4 },
    bottom: { style: BorderStyle.SINGLE, color: sectionBg, size: 4 },
    left: { style: BorderStyle.SINGLE, color: sectionBg, size: 4 },
    right: { style: BorderStyle.SINGLE, color: sectionBg, size: 4 },
  };
}

const cellBorder = {
  top: { style: BorderStyle.SINGLE, color: 'BFBFBF', size: 2 },
  bottom: { style: BorderStyle.SINGLE, color: 'BFBFBF', size: 2 },
  left: { style: BorderStyle.SINGLE, color: 'BFBFBF', size: 2 },
  right: { style: BorderStyle.SINGLE, color: 'BFBFBF', size: 2 },
};

function makeBulletParagraph(text) {
  return new Paragraph({
    children: inlineRuns(text, { size: 20, color: COLORS.black }),
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
  });
}

function makeNormalParagraph(text) {
  return new Paragraph({
    children: inlineRuns(text, { size: 20, color: COLORS.gray }),
    spacing: { before: 80, after: 80 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

/**
 * Build a 4-column key-value table for the JOB INFORMATION section.
 * Layout per row: [Label] [Value] [Label] [Value]
 */
function makeWordJobInfoTable(pairs) {
  const rows = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const left = pairs[i];
    const right = i + 1 < pairs.length ? pairs[i + 1] : { key: '', value: '' };

    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: left.key + ':', bold: true, size: 18, color: COLORS.black })],
            spacing: { before: 60, after: 60 },
          })],
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: cellBorder,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: left.value, size: 18, color: COLORS.gray })],
            spacing: { before: 60, after: 60 },
          })],
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: cellBorder,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: right.key ? right.key + ':' : '', bold: true, size: 18, color: COLORS.black })],
            spacing: { before: 60, after: 60 },
          })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: cellBorder,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: right.value, size: 18, color: COLORS.gray })],
            spacing: { before: 60, after: 60 },
          })],
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: cellBorder,
          verticalAlign: VerticalAlign.CENTER,
        }),
      ],
    }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

/**
 * Build a 3-column approvals signature table:
 *   | Prepared By: | Approved By: | Date: |
 *   | ____________ | ____________ | ______ |
 */
function makeWordApprovalsTable(pairs) {
  // pairs: [{key, value}, ...] — we want exactly Prepared By / Approved By / Date as columns
  const labels = pairs.length > 0
    ? pairs
    : [{ key: 'Prepared By', value: 'TBD' }, { key: 'Approved By', value: 'TBD' }, { key: 'Date', value: 'TBD' }];

  const colWidth = Math.floor(100 / labels.length);

  const headerCells = labels.map((p) =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: p.key + ':', bold: true, size: 18, color: COLORS.black })],
        spacing: { before: 60, after: 60 },
      })],
      width: { size: colWidth, type: WidthType.PERCENTAGE },
      borders: cellBorder,
      verticalAlign: VerticalAlign.CENTER,
    })
  );

  const valueCells = labels.map((p) =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: p.value === 'TBD' ? '' : p.value, size: 18, color: COLORS.gray })],
        spacing: { before: 60, after: 60 },
      })],
      width: { size: colWidth, type: WidthType.PERCENTAGE },
      borders: cellBorder,
      verticalAlign: VerticalAlign.CENTER,
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headerCells }),
      new TableRow({ children: valueCells }),
    ],
  });
}

/**
 * Build a boxed section table:
 *   Row 1: Coloured header with section title
 *   Row 2: White content area (or job info table for JOB INFORMATION)
 */
function makeWordSection(title, contentBlocks, sectionBg = DEFAULT_SECTION_BG) {
  const sectionBorder = makeSectionBorder(sectionBg);
  const isJobInfo = isJobInfoSection(title);
  const isApprovals = isApprovalsSection(title);

  let contentChildren = [];

  if (isJobInfo) {
    const pairs = parseKeyValuePairs(contentBlocks);
    if (pairs.length > 0) {
      contentChildren = [makeWordJobInfoTable(pairs)];
    }
  } else if (isApprovals) {
    const pairs = parseKeyValuePairs(contentBlocks);
    contentChildren = [makeWordApprovalsTable(pairs)];
  }

  if (contentChildren.length === 0) {
    // Regular content rendering
    for (const block of contentBlocks) {
      if (block.type === 'heading') {
        contentChildren.push(new Paragraph({
          children: [new TextRun({ text: stripInline(block.text), bold: true, size: 20, color: COLORS.titleColor })],
          spacing: { before: 80, after: 60 },
        }));
      } else if (block.type === 'bullet') {
        block.items.forEach((item) => contentChildren.push(makeBulletParagraph(item)));
      } else if (block.type === 'numbered') {
        block.items.forEach((item, idx) =>
          contentChildren.push(new Paragraph({
            children: inlineRuns(`${idx + 1}. ${item}`, { size: 20 }),
            spacing: { before: 40, after: 40 },
          }))
        );
      } else if (block.type === 'paragraph') {
        contentChildren.push(makeNormalParagraph(block.text));
      }
    }
  }

  if (contentChildren.length === 0) {
    contentChildren.push(new Paragraph({ text: '', spacing: { before: 80, after: 80 } }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: stripInline(title), bold: true, size: 22, color: COLORS.sectionText })],
            spacing: { before: 100, after: 100 },
          })],
          shading: { type: ShadingType.SOLID, color: sectionBg },
          borders: {
            top: sectionBorder.top,
            left: sectionBorder.left,
            right: sectionBorder.right,
            bottom: { style: BorderStyle.NONE },
          },
        })],
      }),
      new TableRow({
        children: [new TableCell({
          children: contentChildren,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: sectionBorder.bottom,
            left: sectionBorder.left,
            right: sectionBorder.right,
          },
        })],
      }),
    ],
  });
}

/**
 * Build the document header:
 *   Left cell (25%): company logo + name
 *   Right cell (75%): "JOB DESCRIPTION" bold title
 */
async function makeHeaderTable(company) {
  const hasCompany = company && company.name;
  const logoUrl = hasCompany ? (company.logoUrl || company.logo_url || null) : null;
  const logo = hasCompany ? await fetchLogoAsNormalizedPng(logoUrl, 100, 60) : null;

  const titleParagraph = new Paragraph({
    children: [new TextRun({ text: 'JOB DESCRIPTION', bold: true, size: 40, color: COLORS.titleColor })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
  });

  if (!hasCompany) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [new TableCell({
          children: [titleParagraph],
          borders: accentBorder,
          verticalAlign: VerticalAlign.CENTER,
        })],
      })],
    });
  }

  const leftChildren = [];
  if (logo) {
    leftChildren.push(new Paragraph({
      children: [new ImageRun({
        data: logo.pngUint8Array,
        transformation: { width: logo.width, height: logo.height },
        type: 'png',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
    }));
  }
  leftChildren.push(new Paragraph({
    children: [new TextRun({ text: company.name, bold: true, size: 18, color: COLORS.titleColor })],
    alignment: AlignmentType.CENTER,
    spacing: { before: logo ? 0 : 100, after: 100 },
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          children: leftChildren,
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: accentBorder,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [titleParagraph],
          width: { size: 75, type: WidthType.PERCENTAGE },
          borders: { ...accentBorder, left: { style: BorderStyle.NONE } },
          verticalAlign: VerticalAlign.CENTER,
        }),
      ],
    })],
  });
}

// ---------------------------------------------------------------------------
// Word export
// ---------------------------------------------------------------------------

export async function downloadAsWord(markdownContent, fileName = 'job-description', company = null, templateTheme = null) {
  const sectionBg = getSectionBg(templateTheme);
  const blocks = parseMarkdown(markdownContent);

  // Skip the generic "JOB DESCRIPTION" heading only
  const titleBlock = blocks.find((b) => b.type === 'heading' && b.level <= 2);
  const rawTitle = titleBlock ? stripInline(titleBlock.text) : '';
  const isGenericTitle = rawTitle.trim().toUpperCase() === 'JOB DESCRIPTION';
  // Only treat the next heading as a job title if it's NOT a numbered section AND not a known JD section name
  const potentialJobTitleBlock = isGenericTitle
    ? blocks.find((b) => b.type === 'heading' && b !== titleBlock)
    : null;
  const isKnownJdSection = (text) =>
    /\b(INFORMATION|PURPOSE|ACCOUNTABILITIES|FINANCIAL|COMMUNICATIONS|QUALIFICATION|TECHNICAL|COMPETENCIES|SPECIAL|APPROVED|RESPONSIBILITIES)\b/i.test(text);
  const jobTitleBlock = (potentialJobTitleBlock &&
    !/^\d+[\.\s]/.test(stripInline(potentialJobTitleBlock.text).trim()) &&
    !isKnownJdSection(stripInline(potentialJobTitleBlock.text).trim()))
    ? potentialJobTitleBlock
    : null;

  const headerTable = await makeHeaderTable(company);

  const docChildren = [
    headerTable,
    new Paragraph({ text: '', spacing: { after: 160 } }),
  ];

  const skipBlocks = new Set([titleBlock, jobTitleBlock].filter(Boolean));
  let currentSectionTitle = null;
  let currentSectionBlocks = [];

  for (const block of blocks) {
    if (skipBlocks.has(block)) continue;

    if (block.type === 'heading') {
      if (currentSectionTitle !== null) {
        docChildren.push(makeWordSection(currentSectionTitle, currentSectionBlocks, sectionBg));
        docChildren.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        currentSectionBlocks = [];
      }
      currentSectionTitle = block.text;
    } else {
      if (currentSectionTitle !== null) {
        currentSectionBlocks.push(block);
      }
    }
  }

  if (currentSectionTitle !== null) {
    docChildren.push(makeWordSection(currentSectionTitle, currentSectionBlocks, sectionBg));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children: docChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${fileName}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

export async function downloadAsPdf(markdownContent, fileName = 'job-description', company = null, templateTheme = null) {
  const sectionColorHex = templateTheme?.primaryColor || '#193d6d';
  const blocks = parseMarkdown(markdownContent);

  const titleBlock = blocks.find((b) => b.type === 'heading' && b.level <= 2);
  const rawTitle = titleBlock ? stripInline(titleBlock.text) : '';
  const isGenericTitle = rawTitle.trim().toUpperCase() === 'JOB DESCRIPTION';
  const potentialJobTitleBlock = isGenericTitle
    ? blocks.find((b) => b.type === 'heading' && b !== titleBlock)
    : null;
  const isKnownJdSectionPdf = (text) =>
    /\b(INFORMATION|PURPOSE|ACCOUNTABILITIES|FINANCIAL|COMMUNICATIONS|QUALIFICATION|TECHNICAL|COMPETENCIES|SPECIAL|APPROVED|RESPONSIBILITIES)\b/i.test(text);
  const jobTitleBlock = (potentialJobTitleBlock &&
    !/^\d+[\.\s]/.test(stripInline(potentialJobTitleBlock.text).trim()) &&
    !isKnownJdSectionPdf(stripInline(potentialJobTitleBlock.text).trim()))
    ? potentialJobTitleBlock
    : null;

  const hasCompany = company && company.name;
  const logoUrl = hasCompany ? (company.logoUrl || company.logo_url || null) : null;
  const logo = await fetchLogoAsNormalizedPng(logoUrl, 110, 56);

  // Build header HTML
  let headerHtml;
  if (hasCompany) {
    const logoImg = logo
      ? `<img src="${logo.dataUrl}" style="max-height:56px;max-width:110px;display:block;margin:0 auto 6px;border-radius:8px;" />`
      : '';
    headerHtml = `
      <div style="display:flex;border:2px solid #2E75B6;margin-bottom:16px;">
        <div style="width:25%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px;border-right:2px solid #2E75B6;background:#fff;">
          ${logoImg}
          <div style="font-size:12px;font-weight:700;color:#1F3864;text-align:center;">${company.name}</div>
        </div>
        <div style="width:75%;display:flex;align-items:center;justify-content:center;padding:16px;background:#fff;">
          <div style="font-size:22px;font-weight:700;color:#1F3864;letter-spacing:2px;">JOB DESCRIPTION</div>
        </div>
      </div>`;
  } else {
    headerHtml = `
      <div style="border:2px solid #2E75B6;padding:20px;margin-bottom:16px;text-align:center;background:#fff;">
        <div style="font-size:22px;font-weight:700;color:#1F3864;letter-spacing:2px;">JOB DESCRIPTION</div>
      </div>`;
  }

  // Build body HTML - each section as a boxed table
  const skipBlocks = new Set([titleBlock, jobTitleBlock].filter(Boolean));
  let bodyHtml = '';
  let currentSectionTitle = null;
  let currentSectionBlocks = [];

  function flushPdfSection() {
    if (currentSectionTitle === null) return;

    const isJobInfo = isJobInfoSection(currentSectionTitle);
    const isApprovals = isApprovalsSection(currentSectionTitle);
    let contentHtml = '';

    if (isJobInfo) {
      const pairs = parseKeyValuePairs(currentSectionBlocks);
      if (pairs.length > 0) {
        contentHtml = '<table style="width:100%;border-collapse:collapse;">';
        for (let i = 0; i < pairs.length; i += 2) {
          const left = pairs[i];
          const right = i + 1 < pairs.length ? pairs[i + 1] : { key: '', value: '' };
          contentHtml += `
            <tr>
              <td style="font-size:11px;font-weight:700;color:#000;padding:5px 8px;border:1px solid #BFBFBF;width:20%;">${left.key}:</td>
              <td style="font-size:11px;color:#595959;padding:5px 8px;border:1px solid #BFBFBF;width:30%;">${left.value}</td>
              <td style="font-size:11px;font-weight:700;color:#000;padding:5px 8px;border:1px solid #BFBFBF;width:25%;">${right.key ? right.key + ':' : ''}</td>
              <td style="font-size:11px;color:#595959;padding:5px 8px;border:1px solid #BFBFBF;width:25%;">${right.value}</td>
            </tr>`;
        }
        contentHtml += '</table>';
      }
    } else if (isApprovals) {
      const rawPairs = parseKeyValuePairs(currentSectionBlocks);
      const pairs = rawPairs.length > 0
        ? rawPairs
        : [{ key: 'Prepared By', value: '' }, { key: 'Approved By', value: '' }, { key: 'Date', value: '' }];
      const colPct = Math.floor(100 / pairs.length);
      contentHtml = '<table style="width:100%;border-collapse:collapse;">';
      // Header row (labels)
      contentHtml += '<tr>';
      pairs.forEach((p) => {
        contentHtml += `<td style="font-size:11px;font-weight:700;color:#000;padding:6px 8px;border:1px solid #BFBFBF;width:${colPct}%;">${p.key}:</td>`;
      });
      contentHtml += '</tr>';
      // Signature row (values — blank line if TBD)
      contentHtml += '<tr>';
      pairs.forEach((p) => {
        const val = p.value === 'TBD' ? '' : (p.value || '');
        contentHtml += `<td style="font-size:11px;color:#595959;padding:18px 8px 6px;border:1px solid #BFBFBF;width:${colPct}%;">${val}</td>`;
      });
      contentHtml += '</tr>';
      contentHtml += '</table>';
    }

    if (!contentHtml) {
      for (const block of currentSectionBlocks) {
        if (block.type === 'bullet') {
          contentHtml += '<ul style="margin:4px 0 4px 18px;padding:0;">';
          block.items.forEach((item) => {
            contentHtml += `<li style="font-size:11px;color:#333;margin:3px 0;">${renderInlineHtml(item)}</li>`;
          });
          contentHtml += '</ul>';
        } else if (block.type === 'numbered') {
          contentHtml += '<ol style="margin:4px 0 4px 18px;padding:0;">';
          block.items.forEach((item) => {
            contentHtml += `<li style="font-size:11px;color:#333;margin:3px 0;">${renderInlineHtml(item)}</li>`;
          });
          contentHtml += '</ol>';
        } else if (block.type === 'paragraph') {
          contentHtml += `<p style="font-size:11px;color:#333;margin:4px 0;line-height:1.5;">${renderInlineHtml(block.text)}</p>`;
        } else if (block.type === 'heading') {
          contentHtml += `<div style="font-size:11px;font-weight:700;color:#1F3864;margin:6px 0 3px;">${stripInline(block.text)}</div>`;
        }
      }
    }

    bodyHtml += `
      <div style="margin-bottom:10px;border:1px solid ${sectionColorHex};">
        <div style="background:${sectionColorHex};color:#fff;font-size:12px;font-weight:700;padding:7px 10px;">
          ${stripInline(currentSectionTitle)}
        </div>
        <div style="padding:10px 12px;background:#fff;">
          ${contentHtml || ''}
        </div>
      </div>`;

    currentSectionTitle = null;
    currentSectionBlocks = [];
  }

  for (const block of blocks) {
    if (skipBlocks.has(block)) continue;

    if (block.type === 'heading') {
      flushPdfSection();
      currentSectionTitle = block.text;
    } else if (currentSectionTitle !== null) {
      currentSectionBlocks.push(block);
    }
  }
  flushPdfSection();

  const fullHtml = `
    <div style="font-family:Calibri,Arial,sans-serif;width:750px;padding:0;background:#fff;color:#000;">
      ${headerHtml}
      <div style="padding:0 24px 32px;">${bodyHtml}</div>
    </div>`;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;';
  container.innerHTML = fullHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    let remainingH = imgH;
    let y = margin;

    while (remainingH > 0) {
      const sliceH = Math.min(pageH - margin * 2, remainingH);
      const srcY = (imgH - remainingH) * (canvas.height / imgH);
      const srcH = sliceH * (canvas.height / imgH);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcH;
      pageCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, y, imgW, sliceH);
      remainingH -= sliceH;
      if (remainingH > 0) { pdf.addPage(); y = margin; }
    }

    pdf.save(`${fileName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triggerDownload(blob, filename, mimeType) {
  const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
