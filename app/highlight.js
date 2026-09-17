const WORD_CHAR = /[A-Za-z0-9_]/;
const WORD_END = '(?![A-Za-z0-9_])';

const rule = (source, classes, options = {}) => ({ re: new RegExp(source, 'y'), classes, ...options });

const VIBE_RULES = [
  rule('(#.*)', ['comment'], { anywhere: true }),
  rule(`(obj)(\\s+)([A-Z][A-Za-z0-9]*)${WORD_END}`, ['decl', null, 'type']),
  rule(`(do)(\\s+)(\\d+)(\\s+)(times)${WORD_END}`, ['control', null, 'literal', null, 'control']),
  rule(`(do)(\\s+)([a-z][A-Za-z0-9]*)${WORD_END}`, ['decl', null, 'fn']),
  rule('(end)(?=\\s*$)', ['decl'], { lineStart: true }),
  rule(`(includes|from)${WORD_END}`, ['decl']),
  rule(`(new)(\\s+)([A-Z][A-Za-z0-9]*)${WORD_END}`, ['decl', null, 'type']),
  rule(`(is from the environment)${WORD_END}`, ['header']),
  rule(`(uses|maybe)${WORD_END}`, ['header'], { lineStart: true, block: true }),
  rule('(sort by|serves|[a-z_][a-z0-9_]*(?:\\(s\\))?)(\\s*)(:)(?=\\s|$)', ['header', null, 'header'], { lineStart: true, block: true }),
  rule(`(if failed|if refused)${WORD_END}`, ['control']),
  rule(`(then|also)${WORD_END}`, ['change']),
  rule(`(otherwise if|otherwise|when|if)${WORD_END}`, ['control']),
  rule(`(for each|keep going until|skip|stop)${WORD_END}`, ['control']),
  rule(`(column|row|text|button|heading|input|image)${WORD_END}`, ['type'], { lineStart: true, block: true }),
  rule(`(add)${WORD_END}`, ['connect'], { lineStart: true, block: true }),
  rule('(any)(?=\\.)', ['owner']),
  rule('(first|any|every)(?=\\s+[a-z_])', ['connect']),
  rule(`(is between the range of|is greater or equal to|is less or equal to|is in the same month as|is greater than|is less than|is not in|is missing|is before|is after|is not|is in|is|contains|starts with|ends with)${WORD_END}`, ['connect']),
  rule(`(where|in|to|of|by|and|or|not|can be|are a list of|are)${WORD_END}`, ['connect']),
  rule('(=>)', ['change'], { anywhere: true }),
  rule('(@[a-z_][a-z0-9_]*)(\\(s\\))?(\\s+)([A-Za-z_][A-Za-z0-9_]*)(?=\\s*$)', ['attr', 'plural', null, 'type'], { lineStart: true, block: true }),
  rule('(@[a-z_][a-z0-9_]*)(\\(s\\))?', ['attr', 'plural'], { anywhere: true }),
  rule('(\\.)([a-z_][A-Za-z0-9_]*)(?=\\((?!s\\)))', ['punct', 'fn'], { anywhere: true }),
  rule('(\\.)([a-z_][A-Za-z0-9_]*)(\\(s\\))?', ['punct', 'member', 'plural'], { anywhere: true }),
  rule(`(http|db|Date|Time|DateTime|request|response|print|id)${WORD_END}`, ['builtin']),
  rule('(\\$[0-9][0-9_,]*(?:\\.[0-9]+)?)', ['literal'], { anywhere: true }),
  rule(`(\\d{4}-\\d{2}-\\d{2})${WORD_END}`, ['literal']),
  rule(`(\\d{1,2}:\\d{2}(?::\\d{2})?(?:am|pm)?)${WORD_END}`, ['literal']),
  rule(`(\\d{1,2}(?:am|pm))${WORD_END}`, ['literal']),
  rule(`(\\d+\\.\\.\\.\\d+)${WORD_END}`, ['literal']),
  rule(`(\\d+)(\\s*)(hours?|minutes?|seconds?|days?|weeks?|months?|years?|times|mi|km)${WORD_END}`, ['literal', null, 'literal']),
  rule(`(True|False)${WORD_END}`, ['literal']),
  rule(`(\\d+(?:\\.\\d+)?%?)${WORD_END}`, ['literal']),
  rule(`([A-Z][A-Z0-9_]+)${WORD_END}(\\(s\\))?`, ['constant', 'plural']),
  rule(`([A-Z][A-Za-z0-9]*)${WORD_END}`, ['type']),
  rule('(\\(s\\))', ['plural'], { anywhere: true }),
  rule('(\\.\\.\\.)', ['punct'], { anywhere: true }),
  rule('([+\\-*/])', ['punct'], { anywhere: true }),
];

export function tokenizeVibeLine(line, inner = false) {
  if (!inner && /^\s*---\s*$/.test(line)) return [[line, 'divider']];
  const tokens = [];
  let plain = '';
  const flush = () => {
    if (plain) tokens.push([plain, null]);
    plain = '';
  };
  const indentEnd = line.length - line.trimStart().length;
  let pos = 0;
  while (pos < line.length) {
    const char = line[pos];
    if (char === '"') {
      flush();
      pos = readString(line, pos, tokens);
      continue;
    }
    const atWordStart = pos === 0 || !WORD_CHAR.test(line[pos - 1]);
    const atLineStart = !inner && pos <= indentEnd;
    let matched = false;
    for (const candidate of VIBE_RULES) {
      if (candidate.lineStart && !atLineStart) continue;
      if (candidate.block && inner) continue;
      if (!candidate.anywhere && !atWordStart) continue;
      candidate.re.lastIndex = pos;
      const match = candidate.re.exec(line);
      if (!match || match[0].length === 0) continue;
      flush();
      candidate.classes.forEach((cls, index) => {
        const text = match[index + 1];
        if (text) tokens.push([text, cls]);
      });
      pos += match[0].length;
      matched = true;
      break;
    }
    if (matched) continue;
    if (WORD_CHAR.test(char)) {
      let end = pos;
      while (end < line.length && WORD_CHAR.test(line[end])) end++;
      plain += line.slice(pos, end);
      pos = end;
    } else {
      plain += char;
      pos++;
    }
  }
  flush();
  return tokens;
}

function readString(line, start, tokens) {
  let pos = start + 1;
  let text = '"';
  while (pos < line.length) {
    const char = line[pos];
    if (char === '{') {
      const close = line.indexOf('}', pos + 1);
      if (close !== -1) {
        if (text) tokens.push([text, 'string']);
        text = '';
        tokens.push(['{', 'interp']);
        tokens.push(...tokenizeVibeLine(line.slice(pos + 1, close), true));
        tokens.push(['}', 'interp']);
        pos = close + 1;
        continue;
      }
    }
    text += char;
    pos++;
    if (char === '"') break;
  }
  if (text) tokens.push([text, 'string']);
  return pos;
}

function tokenizeMarkdownInline(line) {
  const tokens = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(^\s*[-*]\s)|(\|)/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    if (match.index > last) tokens.push([line.slice(last, match.index), null]);
    const cls = match[1] ? 'md-code' : match[2] ? 'md-bold' : 'punct';
    tokens.push([match[0], cls]);
    last = match.index + match[0].length;
  }
  if (last < line.length) tokens.push([line.slice(last), null]);
  return tokens;
}

const escapeHtml = (text) => text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);

const renderTokens = (tokens) =>
  tokens.map(([text, cls]) => (cls ? `<span class="t-${cls}">${escapeHtml(text)}</span>` : escapeHtml(text))).join('');

const lineCache = new Map();

function cached(key, build) {
  let html = lineCache.get(key);
  if (html === undefined) {
    if (lineCache.size > 20000) lineCache.clear();
    html = build();
    lineCache.set(key, html);
  }
  return html;
}

export const modeFor = (name) => (/\.(md|markdown)$/i.test(name) ? 'markdown' : /\.txt$/i.test(name) ? 'text' : 'vibe');

export function highlightLines(text, mode) {
  const lines = text.split('\n');
  if (mode === 'text') return lines.map(escapeHtml);
  if (mode === 'vibe') return lines.map((line) => cached(`v${line}`, () => renderTokens(tokenizeVibeLine(line))));
  let inFence = false;
  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return `<span class="t-comment">${escapeHtml(line)}</span>`;
    }
    if (inFence) return cached(`v${line}`, () => renderTokens(tokenizeVibeLine(line)));
    if (/^#{1,6}\s/.test(line)) return `<span class="t-md-heading">${escapeHtml(line)}</span>`;
    if (/^\s*---\s*$/.test(line)) return `<span class="t-divider">${escapeHtml(line)}</span>`;
    return cached(`m${line}`, () => renderTokens(tokenizeMarkdownInline(line)));
  });
}
