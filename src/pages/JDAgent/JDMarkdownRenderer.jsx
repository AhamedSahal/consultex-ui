import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ---------------------------------------------------------------------------
// Helpers (mirrors downloadUtils.js logic)
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

function parseKeyValuePairs(blocks) {
  const pairs = [];
  for (const block of blocks) {
    let texts = [];
    if (block.type === 'paragraph') texts = [block.text];
    else if (block.type === 'bullet') texts = block.items;

    for (const text of texts) {
      const chunks = text.split(/\s*\|\s*/);
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
  return pairs;
}

// ---------------------------------------------------------------------------
// Block renderer
// ---------------------------------------------------------------------------

function renderBlock(block, idx) {
  if (block.type === 'bullet') {
    return (
      <ul key={idx} className="jd-preview-list">
        {block.items.map((item, i) => (
          <li key={i}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <span>{children}</span> }}>
              {item}
            </ReactMarkdown>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === 'numbered') {
    return (
      <ol key={idx} className="jd-preview-list jd-preview-list-ol">
        {block.items.map((item, i) => (
          <li key={i}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <span>{children}</span> }}>
              {item}
            </ReactMarkdown>
          </li>
        ))}
      </ol>
    );
  }
  if (block.type === 'heading') {
    return (
      <div key={idx} className="jd-preview-subheading">
        {stripInline(block.text)}
      </div>
    );
  }
  // paragraph
  return (
    <p key={idx} className="jd-preview-paragraph">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <>{children}</> }}>
        {block.text}
      </ReactMarkdown>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function JDMarkdownRenderer({ content, primaryColor, jobInfoColumns = 2 }) {
  const blocks = parseMarkdown(content);

  // Check if this looks like a structured JD (has headings)
  const hasHeadings = blocks.some((b) => b.type === 'heading');
  if (!hasHeadings) {
    // Plain text response — render normally
    return (
      <div className="jd-preview-plain">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  // Skip the generic "JOB DESCRIPTION" heading and job title heading
  const titleBlock = blocks.find((b) => b.type === 'heading' && b.level <= 2);
  const rawTitle = titleBlock ? stripInline(titleBlock.text) : '';
  const isGenericTitle = rawTitle.trim().toUpperCase() === 'JOB DESCRIPTION';
  const potentialJobTitleBlock = isGenericTitle
    ? blocks.find((b) => b.type === 'heading' && b !== titleBlock)
    : null;
  const jobTitleBlock =
    potentialJobTitleBlock && !/^\d+[\.\s]/.test(stripInline(potentialJobTitleBlock.text).trim())
      ? potentialJobTitleBlock
      : null;

  // Group into sections
  const skipBlocks = new Set([titleBlock, jobTitleBlock].filter(Boolean));
  const sections = [];
  let currentSection = null;

  for (const block of blocks) {
    if (skipBlocks.has(block)) continue;
    if (block.type === 'heading') {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: block.text, blocks: [] };
    } else if (currentSection) {
      currentSection.blocks.push(block);
    }
  }
  if (currentSection) sections.push(currentSection);

  // If no sections were found, fall back to plain render
  if (sections.length === 0) {
    return (
      <div className="jd-preview-plain">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="jd-preview">
      {sections.map((section, idx) => {
        const isJobInfo = isJobInfoSection(section.title);
        const pairs = isJobInfo ? parseKeyValuePairs(section.blocks) : [];

        // jobInfoColumns: 2 = 1 pair per row (label|value), 4+ = 2 pairs per row (label|value|label|value)
        const pairsPerRow = jobInfoColumns >= 4 ? 2 : 1;
        const rows = [];
        for (let i = 0; i < pairs.length; i += pairsPerRow) {
          rows.push(pairsPerRow === 2
            ? [pairs[i], pairs[i + 1] || null]
            : [pairs[i]]);
        }

        return (
          <div
            key={idx}
            className="jd-preview-section"
            style={primaryColor ? { '--section-color': primaryColor } : undefined}
          >
            <div className="jd-preview-section-header">
              {stripInline(section.title)}
            </div>
            <div className="jd-preview-section-body">
              {isJobInfo && rows.length > 0 ? (
                <table className="jd-preview-info-table">
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="jd-preview-info-label">{row[0].key}:</td>
                        <td className="jd-preview-info-value">{row[0].value}</td>
                        {pairsPerRow === 2 && (
                          <>
                            <td className="jd-preview-info-label">{row[1]?.key ? `${row[1].key}:` : ''}</td>
                            <td className="jd-preview-info-value">{row[1]?.value ?? ''}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                section.blocks.map((block, blockIdx) => renderBlock(block, blockIdx))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default JDMarkdownRenderer;
