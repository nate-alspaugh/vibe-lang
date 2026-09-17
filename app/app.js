import { highlightLines, modeFor } from './highlight.js';
import { makeZip } from './zip.js';
import { loadWorkspace, saveWorkspace, askForPersistentStorage } from './storage.js';

const $ = (selector) => document.querySelector(selector);

const ICONS = {
  chevron: '<svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg>',
  project: '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><path d="M5.5 6.5h5M5.5 9.5h3"/></svg>',
  folder: '<svg viewBox="0 0 16 16"><path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"/></svg>',
  file: '<svg viewBox="0 0 16 16"><path d="M4 2.5h5l3 3v8H4z"/><path d="M9 2.5v3h3"/></svg>',
  book: '<svg viewBox="0 0 16 16"><path d="M3 3.5a1 1 0 0 1 1-1h8.5v10H4a1 1 0 0 0-1 1z"/><path d="M3 13.5a1 1 0 0 1 1-1h8.5v1H4"/></svg>',
  more: '<svg viewBox="0 0 16 16"><circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/></svg>',
  plus: '<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>',
  share: '<svg viewBox="0 0 16 16"><path d="M8 10V2.5M5 5.5l3-3 3 3"/><path d="M3.5 8.5v4a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-4"/></svg>',
  menu: '<svg viewBox="0 0 16 16"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg>',
  sun: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/></svg>',
  moon: '<svg viewBox="0 0 16 16"><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"/></svg>',
  auto: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" class="fill"/></svg>',
  sidebar: '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6 3v10"/></svg>',
};

const THEME_ORDER = ['system', 'light', 'dark'];
const THEME_ICON = { system: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABEL = { system: 'Theme: match system', light: 'Theme: light', dark: 'Theme: dark' };

const SEEDS = {
  refs: [
    { name: 'vibe-spec.md', version: 5, previous: ['1txp1jz', '3o3dc2', 'uc3chs', '1tgrg38'], url: 'spec/vibe-spec.md' },
    { name: 'AGENTS.md', version: 2, previous: ['22c434'], url: 'spec/AGENTS.md' },
  ],
  examplesProject: 'examples',
  examples: [
    { key: 'service_call.vibe', version: 2, previous: ['gsivs7'], folder: null, name: 'service_call.vibe', url: 'spec/examples/service_call.vibe' },
    { key: 'dates_and_times.vibe', version: 1, previous: [], folder: null, name: 'dates_and_times.vibe', url: 'spec/examples/dates_and_times.vibe' },
    { key: 'database/renewal_case.vibe', version: 6, previous: ['14sww1x', '8jxa1a', '1uv1rcd', '1y1gw04', '15esoq5'], folder: 'database', name: 'renewal_case.vibe', url: 'spec/examples/database/renewal_case.vibe' },
    { key: 'database/property_lease.vibe', version: 5, previous: ['12rre17', '1wt1ytb', '1jj7rcm', '155afi7'], folder: 'database', name: 'property_lease.vibe', url: 'spec/examples/database/property_lease.vibe' },
    { key: 'database/unit.vibe', version: 4, previous: ['7sr4c7', 'pzwxhq', '1el3in4'], folder: 'database', name: 'unit.vibe', url: 'spec/examples/database/unit.vibe' },
    { key: 'database/tenant.vibe', version: 5, previous: ['4agcy0', '1us28zl', 'fp80k8', 'gkrp3h'], folder: 'database', name: 'tenant.vibe', url: 'spec/examples/database/tenant.vibe' },
  ],
};

const EXAMPLES_BEFORE_TRACKING = ['service_call.vibe'];

function textFingerprint(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

const OPENER = /^\s*(obj\s|do\s|http\.\w+\(|db\.\w+\(|if\s|otherwise\b|when\s|for each\s|keep going until\s|[a-z_][a-z0-9_ ]*(\(s\))?:\s*$)/;
const INDENT = '    ';

let ws = null;
let saveTimer = null;
let pendingDelete = null;
let toastTimer = null;
let installPrompt = null;
let dragId = null;

const textarea = $('#code');
const codeView = $('#code-view');
const scroller = $('#editor-scroll');

const now = () => Date.now();
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
const splitExtension = (name) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
};
const isContainer = (node) => node.kind === 'project' || node.kind === 'folder';
const isDocument = (node) => node.kind === 'file' || node.kind === 'ref';

function emptyWorkspace() {
  return { version: 1, nodes: {}, openId: null, expanded: {}, includeRefs: true, theme: 'system' };
}

function siblingsOf(parentId, kind) {
  return Object.values(ws.nodes).filter((node) => {
    if (node.parentId !== parentId) return false;
    if (parentId !== null) return true;
    return kind === 'ref' ? node.kind === 'ref' : node.kind === 'project';
  });
}

function uniqueName(parentId, kind, wanted, exceptId = null) {
  const taken = new Set(siblingsOf(parentId, kind).filter((node) => node.id !== exceptId).map((node) => node.name.toLowerCase()));
  if (!taken.has(wanted.toLowerCase())) return wanted;
  const [stem, extension] = isDocumentKind(kind) ? splitExtension(wanted) : [wanted, ''];
  let counter = 2;
  while (taken.has(`${stem}-${counter}${extension}`.toLowerCase())) counter++;
  return `${stem}-${counter}${extension}`;
}

const isDocumentKind = (kind) => kind === 'file' || kind === 'ref';

function addNode(kind, parentId, name, content = '') {
  const node = { id: newId(), kind, parentId, name: uniqueName(parentId, kind, name), updatedAt: now() };
  if (isDocumentKind(kind)) node.content = content;
  ws.nodes[node.id] = node;
  return node;
}

function childrenOf(id) {
  const kids = Object.values(ws.nodes).filter((node) => node.parentId === id);
  return [...kids.filter((node) => node.kind === 'folder').sort(byName), ...kids.filter((node) => node.kind === 'file').sort(byName)];
}

const projects = () => Object.values(ws.nodes).filter((node) => node.kind === 'project').sort(byName);
const refs = () => Object.values(ws.nodes).filter((node) => node.kind === 'ref').sort(byName);

function ancestry(id) {
  const chain = [];
  let node = ws.nodes[id];
  while (node) {
    chain.unshift(node);
    node = node.parentId ? ws.nodes[node.parentId] : null;
  }
  return chain;
}

function descendantsOf(id) {
  const found = [];
  const walk = (parentId) =>
    childrenOf(parentId).forEach((child) => {
      found.push(child);
      walk(child.id);
    });
  walk(id);
  return found;
}

async function fetchText(url) {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : '';
  } catch {
    return '';
  }
}

async function seedWorkspace() {
  ws = { ...emptyWorkspace(), exampleVersions: {}, refVersions: {} };
  for (const seed of SEEDS.refs) {
    addNode('ref', null, seed.name, await fetchText(seed.url));
    ws.refVersions[seed.name] = seed.version;
  }
  const { touched } = await syncExamples();
  ws.openId = touched[0]?.id ?? null;
}

async function syncRefs() {
  const versions = ws.refVersions ?? Object.fromEntries(SEEDS.refs.map((seed) => [seed.name, 1]));
  const pending = SEEDS.refs.filter((seed) => (versions[seed.name] ?? 1) < seed.version);
  const touched = [];
  for (const seed of pending) {
    const text = await fetchText(seed.url);
    if (!text) continue;
    const existing = refs().find((node) => node.name === seed.name);
    if (existing && seed.previous.includes(textFingerprint(existing.content ?? ''))) {
      existing.content = text;
      existing.updatedAt = now();
      touched.push(existing);
    }
    versions[seed.name] = seed.version;
  }
  const changed = pending.length > 0 || !ws.refVersions;
  ws.refVersions = versions;
  return { touched, changed };
}

function findExampleFile(example) {
  const project = projects().find((node) => node.name === SEEDS.examplesProject);
  if (!project) return null;
  const folder = example.folder ? childrenOf(project.id).find((node) => node.kind === 'folder' && node.name === example.folder) : project;
  return folder ? childrenOf(folder.id).find((node) => node.kind === 'file' && node.name === example.name) ?? null : null;
}

function exampleParentId(example) {
  const project = projects().find((node) => node.name === SEEDS.examplesProject) ?? addNode('project', null, SEEDS.examplesProject);
  ws.expanded[project.id] = true;
  if (!example.folder) return project.id;
  const folder = childrenOf(project.id).find((node) => node.kind === 'folder' && node.name === example.folder) ?? addNode('folder', project.id, example.folder);
  ws.expanded[folder.id] = true;
  return folder.id;
}

async function syncExamples() {
  const versions = ws.exampleVersions ?? Object.fromEntries((ws.seededExamples ?? EXAMPLES_BEFORE_TRACKING).map((key) => [key, 1]));
  const pending = SEEDS.examples.filter((example) => (versions[example.key] ?? 0) < example.version);
  const fetched = await Promise.all(pending.map(async (example) => ({ example, text: await fetchText(example.url) })));
  const touched = [];
  const added = [];
  for (const { example, text } of fetched) {
    if (!text) continue;
    if (versions[example.key]) {
      const existing = findExampleFile(example);
      if (existing && example.previous.includes(textFingerprint(existing.content ?? ''))) {
        existing.content = text;
        existing.updatedAt = now();
        touched.push(existing);
      }
    } else {
      const node = addNode('file', exampleParentId(example), example.name, text);
      touched.push(node);
      added.push(node);
    }
    versions[example.key] = example.version;
  }
  const changed = pending.length > 0 || 'seededExamples' in ws;
  ws.exampleVersions = versions;
  delete ws.seededExamples;
  return { touched, added, changed };
}

function setSaveState(text) {
  $('#save-state').textContent = text;
}

function scheduleSave() {
  setSaveState('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

async function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const ok = await saveWorkspace(ws);
  setSaveState(ok ? 'Saved' : 'Could not save — back up your work');
}

function treeRowHtml(node, depth) {
  const expanded = !!ws.expanded[node.id];
  const icon = node.kind === 'project' ? 'project' : node.kind === 'folder' ? 'folder' : node.kind === 'ref' ? 'book' : 'file';
  const classes = ['row', `kind-${node.kind}`, node.id === ws.openId ? 'is-open' : '', expanded ? 'is-expanded' : ''].join(' ');
  const twisty = isContainer(node) ? `<span class="twisty">${ICONS.chevron}</span>` : '<span class="twisty"></span>';
  const aria = isContainer(node) ? ` aria-expanded="${expanded}"` : '';
  return `<div class="${classes}" role="treeitem" tabindex="0" draggable="${node.kind !== 'ref'}" data-id="${node.id}" style="--depth:${depth}"${aria}>
    ${twisty}<span class="icon">${ICONS[icon]}</span><span class="name">${escapeHtml(node.name)}</span>
    <button class="more" data-more aria-label="Options for ${escapeHtml(node.name)}">${ICONS.more}</button>
  </div>`;
}

function renderTree() {
  const rows = [];
  const walk = (node, depth) => {
    rows.push(treeRowHtml(node, depth));
    if (isContainer(node) && ws.expanded[node.id]) childrenOf(node.id).forEach((child) => walk(child, depth + 1));
  };
  projects().forEach((project) => walk(project, 0));
  $('#tree').innerHTML = rows.length
    ? rows.join('')
    : '<p class="tree-empty">No projects yet.<br><button class="link" data-new-project>Make your first project</button></p>';
  $('#refs').innerHTML = refs()
    .map((ref) => treeRowHtml(ref, 0))
    .join('');
}

function renderCrumbs() {
  const node = ws.nodes[ws.openId];
  $('#crumbs').innerHTML = node
    ? ancestry(node.id)
        .map((part, index, all) => `<span class="${index === all.length - 1 ? 'crumb current' : 'crumb'}">${escapeHtml(part.name)}</span>`)
        .join('<span class="crumb-sep">/</span>')
    : '<span class="crumb current">just vibin\'</span>';
  $('#share-btn').disabled = !node;
  document.title = node ? `${node.name} · just vibin'` : "just vibin'";
}

function renderEditor() {
  const node = ws.nodes[ws.openId];
  if (!node) return;
  const lines = highlightLines(textarea.value, modeFor(node.name));
  codeView.innerHTML = lines.map((html) => `<div class="line">${html || '<br>'}</div>`).join('');
  markCurrentLine();
}

function caretLineIndex() {
  return textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
}

function markCurrentLine() {
  const index = caretLineIndex();
  codeView.querySelector('.line.current')?.classList.remove('current');
  if (document.activeElement === textarea) codeView.children[index]?.classList.add('current');
  const before = textarea.value.slice(0, textarea.selectionStart);
  const column = before.length - before.lastIndexOf('\n');
  const total = textarea.value.split('\n').length;
  $('#cursor-pos').textContent = `Line ${index + 1}, Col ${column} · ${total} ${total === 1 ? 'line' : 'lines'}`;
}

function keepCaretVisible() {
  const line = codeView.children[caretLineIndex()];
  if (!line) return;
  const top = line.offsetTop;
  const bottom = top + line.offsetHeight;
  const margin = 48;
  if (bottom + margin > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom + margin - scroller.clientHeight;
  else if (top - margin < scroller.scrollTop) scroller.scrollTop = Math.max(0, top - margin);
}

function updateModeLabel(node) {
  $('#mode-label').textContent = { vibe: 'vibe', markdown: 'Markdown', text: 'Plain text' }[modeFor(node.name)];
}

function showEditor(visible) {
  $('#editor-wrap').hidden = !visible;
  $('#empty').hidden = visible;
}

function openDocument(id, { focus = false } = {}) {
  const node = ws.nodes[id];
  if (!node || !isDocument(node)) return;
  ws.openId = id;
  ancestry(id)
    .slice(0, -1)
    .forEach((part) => (ws.expanded[part.id] = true));
  textarea.value = node.content ?? '';
  textarea.setSelectionRange(0, 0);
  updateModeLabel(node);
  showEditor(true);
  renderEditor();
  renderTree();
  renderCrumbs();
  scroller.scrollTop = 0;
  closeDrawer();
  if (focus) textarea.focus();
  scheduleSave();
}

function closeDocument() {
  ws.openId = null;
  textarea.value = '';
  codeView.innerHTML = '';
  showEditor(false);
  renderCrumbs();
}

function replaceSelection(text, selectStart, selectEnd) {
  textarea.focus();
  const inserted = document.execCommand && document.execCommand('insertText', false, text);
  if (!inserted) {
    textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (selectStart !== undefined) textarea.setSelectionRange(selectStart, selectEnd);
}

function selectedLineRange() {
  const { value, selectionStart, selectionEnd } = textarea;
  const start = value.lastIndexOf('\n', selectionStart - 1) + 1;
  let end = value.indexOf('\n', selectionEnd > selectionStart && value[selectionEnd - 1] === '\n' ? selectionEnd - 1 : selectionEnd);
  if (end === -1) end = value.length;
  return { start, end, lines: value.slice(start, end).split('\n') };
}

function editLines(transform) {
  const { start, end, lines } = selectedLineRange();
  const next = transform(lines).join('\n');
  textarea.setSelectionRange(start, end);
  replaceSelection(next, start, start + next.length);
}

function indentSelection() {
  const { selectionStart, selectionEnd, value } = textarea;
  if (!value.slice(selectionStart, selectionEnd).includes('\n')) {
    replaceSelection(INDENT);
    return;
  }
  editLines((lines) => lines.map((line) => (line.trim() ? INDENT + line : line)));
}

function outdentSelection() {
  editLines((lines) => lines.map((line) => line.replace(/^ {1,4}|^\t/, '')));
}

function toggleComment() {
  editLines((lines) => {
    const filled = lines.filter((line) => line.trim());
    const allCommented = filled.length > 0 && filled.every((line) => /^\s*#/.test(line));
    if (allCommented) return lines.map((line) => line.replace(/^(\s*)# ?/, '$1'));
    const indent = Math.min(...filled.map((line) => line.length - line.trimStart().length));
    return lines.map((line) => (line.trim() ? `${line.slice(0, indent)}# ${line.slice(indent)}` : line));
  });
}

function newlineWithIndent() {
  const { value, selectionStart } = textarea;
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const before = value.slice(lineStart, selectionStart);
  let indent = before.match(/^\s*/)[0];
  const hasInlineAction = /\bthen\s+\S/.test(before);
  if (OPENER.test(before) && !hasInlineAction && !/^\s*#/.test(before)) indent += INDENT;
  replaceSelection(`\n${indent}`);
}

textarea.addEventListener('input', () => {
  const node = ws.nodes[ws.openId];
  if (!node) return;
  node.content = textarea.value;
  node.updatedAt = now();
  renderEditor();
  keepCaretVisible();
  scheduleSave();
});

textarea.addEventListener('keydown', (event) => {
  const mod = event.metaKey || event.ctrlKey;
  if (event.key === 'Tab' && !mod && !event.altKey) {
    event.preventDefault();
    event.shiftKey ? outdentSelection() : indentSelection();
  } else if (event.key === 'Enter' && !mod && !event.shiftKey && !event.altKey && !event.isComposing) {
    event.preventDefault();
    newlineWithIndent();
  } else if (mod && event.key === '/') {
    event.preventDefault();
    toggleComment();
  }
});

textarea.addEventListener('focus', markCurrentLine);
textarea.addEventListener('blur', () => codeView.querySelector('.line.current')?.classList.remove('current'));
document.addEventListener('selectionchange', () => {
  if (document.activeElement === textarea) markCurrentLine();
});

document.addEventListener('keydown', (event) => {
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveNow();
  } else if (mod && event.shiftKey && event.key.toLowerCase() === 'e' && ws.openId) {
    event.preventDefault();
    openShare(ws.openId);
  } else if (event.key === 'Escape') {
    closeMenu();
    closeDrawer();
  }
});

const dialogs = {
  name: $('#name-dialog'),
  confirm: $('#confirm-dialog'),
  share: $('#share-dialog'),
};

function askName({ title, label, initial = '', action = 'Save', hint = '' }) {
  const dialog = dialogs.name;
  const input = $('#name-input');
  $('#name-title').textContent = title;
  $('#name-label').textContent = label;
  $('#name-hint').textContent = hint;
  $('#name-ok').textContent = action;
  input.value = initial;
  return new Promise((resolve) => {
    dialog.onclose = () => resolve(dialog.returnValue === 'ok' ? input.value.trim() || null : null);
    dialog.returnValue = '';
    dialog.showModal();
    input.focus();
    if (initial.startsWith('.')) input.setSelectionRange(0, 0);
    else input.setSelectionRange(0, splitExtension(initial)[0].length);
  });
}

function confirmAction({ title, message, action = 'Delete' }) {
  const dialog = dialogs.confirm;
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  $('#confirm-ok').textContent = action;
  return new Promise((resolve) => {
    dialog.onclose = () => resolve(dialog.returnValue === 'ok');
    dialog.returnValue = '';
    dialog.showModal();
  });
}

function withExtension(name) {
  return /\.[A-Za-z0-9]+$/.test(name) ? name : `${name}.vibe`;
}

async function createProject() {
  const name = await askName({ title: 'New project', label: 'Project name', action: 'Create', hint: 'Holds folders and pages.' });
  if (!name) return;
  const project = addNode('project', null, name);
  ws.expanded[project.id] = true;
  renderTree();
  scheduleSave();
}

async function createInside(parentId, kind) {
  const parent = ws.nodes[parentId];
  const isFile = kind === 'file';
  const name = await askName({
    title: isFile ? 'New page' : 'New folder',
    label: isFile ? 'Page name' : 'Folder name',
    initial: isFile ? '.vibe' : '',
    action: 'Create',
    hint: isFile ? `Inside ${parent.name}. Leave off the ending and it becomes .vibe.` : `Inside ${parent.name}.`,
  });
  if (!name || name === '.vibe') return;
  ws.expanded[parentId] = true;
  const node = addNode(kind, parentId, isFile ? withExtension(name) : name);
  if (isFile) openDocument(node.id, { focus: true });
  else renderTree();
  scheduleSave();
}

async function createRef() {
  const name = await askName({
    title: 'New reference doc',
    label: 'Doc name',
    initial: '.md',
    action: 'Create',
    hint: 'Reference docs get attached when you share with AI.',
  });
  if (!name || name === '.md') return;
  const node = addNode('ref', null, /\.[A-Za-z0-9]+$/.test(name) ? name : `${name}.md`);
  openDocument(node.id, { focus: true });
}

async function renameNode(id) {
  const node = ws.nodes[id];
  const name = await askName({ title: 'Rename', label: 'New name', initial: node.name, action: 'Rename' });
  if (!name || name === node.name) return;
  node.name = uniqueName(node.parentId, node.kind, name, node.id);
  node.updatedAt = now();
  renderTree();
  renderCrumbs();
  if (node.id === ws.openId) {
    updateModeLabel(node);
    renderEditor();
  }
  scheduleSave();
}

function duplicateNode(id) {
  const node = ws.nodes[id];
  const copy = addNode(node.kind, node.parentId, node.name, node.content);
  openDocument(copy.id);
}

async function deleteNode(id) {
  const node = ws.nodes[id];
  const inside = descendantsOf(id);
  const pages = inside.filter((child) => child.kind === 'file').length;
  const detail = isContainer(node) && inside.length ? ` and everything inside it (${pages} ${pages === 1 ? 'page' : 'pages'})` : '';
  const ok = await confirmAction({
    title: `Delete ${node.name}?`,
    message: `This removes ${node.name}${detail}. You can undo right after.`,
  });
  if (!ok) return;
  const removed = [node, ...inside];
  removed.forEach((item) => delete ws.nodes[item.id]);
  pendingDelete = { removed, openId: ws.openId };
  if (removed.some((item) => item.id === ws.openId)) closeDocument();
  renderTree();
  scheduleSave();
  showToast(`Deleted ${node.name}`, 'Undo', undoDelete);
}

function undoDelete() {
  if (!pendingDelete) return;
  pendingDelete.removed.forEach((item) => (ws.nodes[item.id] = item));
  const root = pendingDelete.removed[0];
  root.name = uniqueName(root.parentId, root.kind, root.name, root.id);
  if (pendingDelete.openId && ws.nodes[pendingDelete.openId]) openDocument(pendingDelete.openId);
  pendingDelete = null;
  renderTree();
  scheduleSave();
}

function moveNode(id, targetId) {
  const node = ws.nodes[id];
  const target = ws.nodes[targetId];
  if (!node || !target || node.kind === 'project' || node.kind === 'ref' || id === targetId) return;
  const destination = isContainer(target) ? target : ws.nodes[target.parentId];
  if (!destination || destination.id === node.parentId) return;
  if (ancestry(destination.id).some((part) => part.id === id)) return;
  node.parentId = destination.id;
  node.name = uniqueName(destination.id, node.kind, node.name, node.id);
  ws.expanded[destination.id] = true;
  renderTree();
  renderCrumbs();
  scheduleSave();
}

function importInto(parentId) {
  const input = $('#import-input');
  input.value = '';
  input.onchange = async () => {
    let last = null;
    for (const file of input.files) last = addNode('file', parentId, file.name, await file.text());
    ws.expanded[parentId] = true;
    if (last) openDocument(last.id);
    else renderTree();
    scheduleSave();
  };
  input.click();
}

function menuItemsFor(node) {
  const share = { label: 'Share with AI…', run: () => openShare(node.id) };
  const rename = { label: 'Rename', run: () => renameNode(node.id) };
  const remove = { label: 'Delete', run: () => deleteNode(node.id), danger: true };
  if (isContainer(node)) {
    return [
      { label: 'New page', run: () => createInside(node.id, 'file') },
      { label: 'New folder', run: () => createInside(node.id, 'folder') },
      { label: 'Import files…', run: () => importInto(node.id) },
      'divider',
      share,
      rename,
      'divider',
      remove,
    ];
  }
  if (node.kind === 'ref') return [share, rename, 'divider', remove];
  return [share, rename, { label: 'Duplicate', run: () => duplicateNode(node.id) }, 'divider', remove];
}

function openMenu(anchor, items) {
  const menu = $('#menu');
  menu.innerHTML = items
    .map((item, index) =>
      item === 'divider'
        ? '<div class="menu-divider" role="separator"></div>'
        : `<button role="menuitem" class="menu-item${item.danger ? ' danger' : ''}" data-index="${index}">${escapeHtml(item.label)}</button>`,
    )
    .join('');
  menu.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const left = Math.min(rect.right - width, window.innerWidth - width - 8);
  const top = rect.bottom + 4 + height > window.innerHeight ? rect.top - height - 4 : rect.bottom + 4;
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
  menu.onclick = (event) => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    closeMenu();
    items[Number(button.dataset.index)].run();
  };
  menu.querySelector('button')?.focus();
}

function closeMenu() {
  $('#menu').hidden = true;
}

document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('#menu') && !event.target.closest('[data-more]') && !event.target.closest('#app-menu-btn')) closeMenu();
});

function handleTreeClick(event) {
  if (event.target.closest('[data-new-project]')) return createProject();
  const row = event.target.closest('.row');
  if (!row) return;
  const node = ws.nodes[row.dataset.id];
  if (event.target.closest('[data-more]')) {
    event.stopPropagation();
    return openMenu(event.target.closest('[data-more]'), menuItemsFor(node));
  }
  if (isContainer(node)) {
    ws.expanded[node.id] = !ws.expanded[node.id];
    renderTree();
    scheduleSave();
  } else {
    openDocument(node.id);
  }
}

function handleTreeKey(event) {
  const row = event.target.closest('.row');
  if (!row || event.target.closest('[data-more]')) return;
  const node = ws.nodes[row.dataset.id];
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    row.click();
  } else if (event.key === 'F2') {
    event.preventDefault();
    renameNode(node.id);
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const rows = [...document.querySelectorAll('.sidebar .row')];
    rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
  }
}

for (const container of [$('#tree'), $('#refs')]) {
  container.addEventListener('click', handleTreeClick);
  container.addEventListener('keydown', handleTreeKey);
  container.addEventListener('dblclick', (event) => {
    const row = event.target.closest('.row');
    if (row && event.target.closest('.name')) renameNode(row.dataset.id);
  });
}

const tree = $('#tree');
tree.addEventListener('dragstart', (event) => {
  const row = event.target.closest('.row');
  if (!row) return;
  dragId = row.dataset.id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', ws.nodes[dragId].name);
  row.classList.add('is-dragging');
});
tree.addEventListener('dragover', (event) => {
  const row = event.target.closest('.row');
  if (!dragId || !row) return;
  event.preventDefault();
  tree.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));
  const target = ws.nodes[row.dataset.id];
  const destination = isContainer(target) ? target : ws.nodes[target.parentId];
  tree.querySelector(`[data-id="${destination?.id}"]`)?.classList.add('drop-target');
});
tree.addEventListener('drop', (event) => {
  const row = event.target.closest('.row');
  event.preventDefault();
  if (dragId && row) moveNode(dragId, row.dataset.id);
});
tree.addEventListener('dragend', () => {
  dragId = null;
  tree.querySelectorAll('.drop-target, .is-dragging').forEach((el) => el.classList.remove('drop-target', 'is-dragging'));
});

let shareNodeId = null;

function relativeEntries(node) {
  if (isDocument(node)) return { files: [{ path: node.name, text: node.content ?? '' }], folders: [] };
  const base = ancestry(node.id).length - 1;
  const pathOf = (item) =>
    ancestry(item.id)
      .slice(base)
      .map((part) => part.name)
      .join('/');
  const inside = descendantsOf(node.id);
  return {
    files: inside.filter((item) => item.kind === 'file').map((item) => ({ path: pathOf(item), text: item.content ?? '' })),
    folders: [node, ...inside.filter((item) => item.kind === 'folder')].map((item) => `${pathOf(item)}/`),
  };
}

function shareRefs(node) {
  return node.kind === 'ref' || !ws.includeRefs ? [] : refs().map((ref) => ({ path: ref.name, text: ref.content ?? '' }));
}

function bundleText(node) {
  const { files } = relativeEntries(node);
  const attached = shareRefs(node);
  if (files.length === 1 && attached.length === 0) return files[0].text;
  const everything = [...attached, ...files];
  const intro = [
    `${node.name} — ${files.length} ${files.length === 1 ? 'file' : 'files'}${attached.length ? ` plus ${attached.length} reference ${attached.length === 1 ? 'doc' : 'docs'}` : ''}.`,
    attached.length ? 'Files ending in .vibe are written in vibe. Read the reference docs first; they are the only authority on vibe syntax.' : '',
    '',
    'Contents:',
    ...everything.map((entry) => `- ${entry.path}`),
  ]
    .filter((line, index) => line || index === 2)
    .join('\n');
  const sections = everything.map((entry) => `===== ${entry.path} =====\n${entry.text.replace(/\n*$/, '')}\n===== end of ${entry.path} =====`);
  return `${intro}\n\n${sections.join('\n\n')}\n`;
}

function formatSize(characters) {
  const tokens = Math.ceil(characters / 4);
  const pretty = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);
  return `${pretty(characters)} characters · about ${pretty(tokens)} tokens`;
}

function refreshShareSummary() {
  const node = ws.nodes[shareNodeId];
  const { files } = relativeEntries(node);
  const attached = shareRefs(node);
  const what = isDocument(node) ? 'This page' : `${files.length} ${files.length === 1 ? 'page' : 'pages'}`;
  const plus = attached.length ? ` + ${attached.length} reference ${attached.length === 1 ? 'doc' : 'docs'}` : '';
  $('#share-summary').textContent = `${what}${plus}`;
  $('#share-size').textContent = formatSize(bundleText(node).length);
}

function openShare(id) {
  const node = ws.nodes[id];
  if (!node) return;
  shareNodeId = id;
  $('#share-title').textContent = `Share ${node.name} with AI`;
  const checkbox = $('#share-include-refs');
  checkbox.checked = ws.includeRefs;
  $('#share-refs-row').hidden = node.kind === 'ref';
  $('#share-refs-names').textContent = refs()
    .map((ref) => ref.name)
    .join(', ') || 'none yet';
  $('#share-native').hidden = !(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] }));
  $('#share-status').textContent = '';
  refreshShareSummary();
  dialogs.share.showModal();
}

$('#share-include-refs').addEventListener('change', (event) => {
  ws.includeRefs = event.target.checked;
  scheduleSave();
  refreshShareSummary();
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand('copy');
    scratch.remove();
    return ok;
  }
}

const txtName = (node) => `${isDocument(node) ? splitExtension(node.name)[0] : node.name}.txt`;

function zipFor(node) {
  const { files, folders } = relativeEntries(node);
  return makeZip([...shareRefs(node), ...folders.map((path) => ({ path })), ...files]);
}

$('#share-actions').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-share]');
  if (!button) return;
  const node = ws.nodes[shareNodeId];
  const status = $('#share-status');
  const kind = button.dataset.share;
  if (kind === 'copy') {
    status.textContent = (await copyText(bundleText(node))) ? 'Copied. Paste it into your chat.' : 'Copy was blocked. Try Download .txt instead.';
  } else if (kind === 'txt') {
    downloadBlob(new Blob([bundleText(node)], { type: 'text/plain;charset=utf-8' }), txtName(node));
    status.textContent = `Downloaded ${txtName(node)}`;
  } else if (kind === 'zip') {
    const name = `${isDocument(node) ? splitExtension(node.name)[0] : node.name}.zip`;
    downloadBlob(zipFor(node), name);
    status.textContent = `Downloaded ${name}`;
  } else if (kind === 'native') {
    try {
      await navigator.share({ files: [new File([bundleText(node)], txtName(node), { type: 'text/plain' })], title: node.name });
      status.textContent = '';
    } catch {}
  }
});

function showToast(message, actionLabel, action) {
  const toast = $('#toast');
  toast.innerHTML = `<span>${escapeHtml(message)}</span>${actionLabel ? `<button class="link">${escapeHtml(actionLabel)}</button>` : ''}`;
  toast.hidden = false;
  toast.querySelector('button')?.addEventListener('click', () => {
    action();
    toast.hidden = true;
  });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
    if (action === undoDelete) pendingDelete = null;
  }, 7000);
}

function applyTheme() {
  const theme = ws.theme || 'system';
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
  const button = $('#theme-btn');
  button.innerHTML = ICONS[THEME_ICON[theme]];
  button.title = THEME_LABEL[theme];
  button.setAttribute('aria-label', THEME_LABEL[theme]);
}

$('#theme-btn').addEventListener('click', () => {
  ws.theme = THEME_ORDER[(THEME_ORDER.indexOf(ws.theme || 'system') + 1) % THEME_ORDER.length];
  applyTheme();
  scheduleSave();
});

function backupEverything() {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([JSON.stringify({ app: "just vibin'", savedAt: new Date().toISOString(), workspace: ws }, null, 2)], { type: 'application/json' }), `just-vibin-backup-${stamp}.json`);
  showToast('Backup downloaded');
}

function restoreFromBackup() {
  const input = $('#restore-input');
  input.value = '';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    let incoming;
    try {
      const parsed = JSON.parse(await file.text());
      incoming = parsed.workspace ?? parsed;
      if (!incoming || typeof incoming.nodes !== 'object') throw new Error('not a backup');
    } catch {
      showToast("That file isn't a just vibin' backup");
      return;
    }
    const count = Object.values(incoming.nodes).filter((node) => node.kind === 'file').length;
    const ok = await confirmAction({
      title: 'Restore this backup?',
      message: `It has ${count} ${count === 1 ? 'page' : 'pages'}. Everything currently in just vibin' gets replaced. Back up first if you're unsure.`,
      action: 'Replace everything',
    });
    if (!ok) return;
    ws = { ...emptyWorkspace(), ...incoming };
    await saveNow();
    boot();
  };
  input.click();
}

async function exportEverythingZip() {
  const entries = [...refs().map((ref) => ({ path: ref.name, text: ref.content ?? '' }))];
  for (const project of projects()) {
    const { files, folders } = relativeEntries(project);
    entries.push(...folders.map((path) => ({ path })), ...files);
  }
  downloadBlob(makeZip(entries), `just-vibin-all-${new Date().toISOString().slice(0, 10)}.zip`);
}

$('#app-menu-btn').addEventListener('click', (event) => {
  const items = [
    { label: 'New project', run: createProject },
    'divider',
    { label: 'Download everything (.zip)', run: exportEverythingZip },
    { label: 'Back up everything (.json)', run: backupEverything },
    { label: 'Restore from backup…', run: restoreFromBackup },
  ];
  if (installPrompt) {
    items.push('divider', {
      label: "Install just vibin' as an app",
      run: async () => {
        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
      },
    });
  }
  openMenu(event.currentTarget, items);
});

document.addEventListener('click', (event) => {
  const closer = event.target.closest('[data-close]');
  if (closer) closer.closest('dialog')?.close('cancel');
});

$('#new-project-btn').addEventListener('click', createProject);
$('#empty-new-project').addEventListener('click', createProject);
$('#new-ref-btn').addEventListener('click', createRef);
$('#share-btn').addEventListener('click', () => ws.openId && openShare(ws.openId));

function openDrawer() {
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  document.body.classList.remove('drawer-open');
}

$('#drawer-btn').addEventListener('click', openDrawer);
$('#scrim').addEventListener('click', closeDrawer);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saveTimer) saveNow();
});
window.addEventListener('pagehide', () => {
  if (saveTimer) saveNow();
});

function paintStaticIcons() {
  $('#new-project-btn').innerHTML = ICONS.plus;
  $('#new-ref-btn').innerHTML = ICONS.plus;
  $('#app-menu-btn').innerHTML = ICONS.menu;
  $('#drawer-btn').innerHTML = ICONS.sidebar;
  $('#share-btn').insertAdjacentHTML('afterbegin', ICONS.share);
}

function boot() {
  applyTheme();
  renderTree();
  if (ws.openId && ws.nodes[ws.openId]) openDocument(ws.openId);
  else closeDocument();
  setSaveState('Saved');
}

async function start() {
  paintStaticIcons();
  ws = await loadWorkspace();
  if (!ws) {
    await seedWorkspace();
    await saveNow();
  }
  ws = { ...emptyWorkspace(), ...ws };
  const references = await syncRefs();
  const examples = await syncExamples();
  const pageToOpen = examples.added[0] ?? examples.touched[0];
  if (pageToOpen) ws.openId = pageToOpen.id;
  if (references.changed || examples.changed) await saveNow();
  boot();
  document.body.classList.add('ready');
  askForPersistentStorage();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();
