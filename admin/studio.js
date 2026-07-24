/**
 * Goran Kolouch — Admin Studio
 * A client-side content editor. Nothing here talks to a server —
 * uploads and edits live in this browser (localStorage for the
 * data, IndexedDB for file blobs) until you use Export to bundle
 * everything into files you commit to the site's repo.
 *
 * IMPORTANT: the password gate below is NOT real security. It's
 * a light deterrent against casual browsing, visible in this file's
 * source to anyone who looks. Don't rely on it to protect anything
 * sensitive.
 */
(function () {
  'use strict';

  const GATE_PASSWORD = 'kolouch2026'; // change this to whatever you like — it's just a deterrent, see note above
  const DB_NAME = 'kolouch_studio_files';
  const STORE = 'files';
  const STATE_KEY = 'kolouch_studio_state';

  let state = { publications: [], categories: [], media: [] };
  let editingId = null;
  let formTags = [];
  let formCover = null;   // { fileId, filename } | null
  let formPdf = null;     // { fileId, filename } | null
  let formDocx = null;    // { fileId, filename } | null
  let slugManuallyEdited = false;

  // ─── IndexedDB (file blob storage) ───
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function putFile(id, blob) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
  async function getFile(id) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }

  // ─── Utilities ───
  function slugify(s) {
    return (s || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function nextPubId() {
    return state.publications.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
  }
  function toast(msg) {
    const el = document.getElementById('studio-toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function saveState() {
    // Store metadata only (small) — file blobs stay in IndexedDB.
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }
  function estimateReadTime(text) {
    const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200)) + ' min read';
  }

  // ─── Gate ───
  function initGate() {
    const gate = document.getElementById('studio-gate');
    const app = document.getElementById('studio-app');
    if (sessionStorage.getItem('studio_unlocked') === '1') {
      gate.style.display = 'none';
      app.classList.add('active');
      bootData();
      return;
    }
    document.getElementById('gate-submit').addEventListener('click', tryUnlock);
    document.getElementById('gate-password').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    function tryUnlock() {
      const val = document.getElementById('gate-password').value;
      if (val === GATE_PASSWORD) {
        sessionStorage.setItem('studio_unlocked', '1');
        gate.style.display = 'none';
        app.classList.add('active');
        bootData();
      } else {
        document.getElementById('gate-error').style.display = 'block';
      }
    }
    document.getElementById('gate-lock').addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('studio_unlocked');
      location.reload();
    });
  }

  // ─── Boot: load existing state, or seed from the live site ───
  async function bootData() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      try { state = JSON.parse(saved); } catch (e) { state = { publications: [], categories: [], media: [] }; }
    }
    if (!state.categories || !state.categories.length) {
      state.categories = [
        { slug: 'discrimination', label: 'Discrimination' },
        { slug: 'religious-freedom', label: 'Religious Freedom' },
        { slug: 'child-safety', label: 'Child Safety & Digital Rights' },
        { slug: 'platform-accountability', label: 'Platform Accountability' },
        { slug: 'research-projects', label: 'Research Projects' },
        { slug: 'legal-filings', label: 'Legal Filings' }
      ];
    }
    if (!state.publications || !state.publications.length) {
      let articles = null;
      try {
        const res = await fetch('../content/articles.json');
        if (res.ok) articles = await res.json();
      } catch (e) { /* fall through */ }
      if (!articles) articles = window.KOLOUCH_ARTICLES_FALLBACK || [];

      state.publications = [];
      for (const a of articles) {
        let body = a.content || null;
        if (a.mdFile && !body) {
          try {
            const r = await fetch('../' + a.mdFile);
            if (r.ok) body = await r.text();
          } catch (e) { /* leave null */ }
        }
        state.publications.push({
          id: a.id || nextPubId(),
          slug: a.slug,
          title: a.title,
          category: a.category,
          categoryLabel: a.categoryLabel,
          date: a.date,
          readTime: a.readTime,
          excerpt: a.excerpt,
          tags: a.tags || [],
          image: a.image || null,
          coverFileId: null, coverFilename: null,
          externalUrl: a.externalUrl || '',
          bodyMode: a.mdFile ? 'markdown' : (a.attachments && a.attachments.length ? 'attachments' : 'markdown'),
          body: body || '',
          pdfFileId: null, pdfFilename: null,
          docxFileId: null, docxFilename: null,
          existingAttachments: a.attachments || [],
          licensedOnly: !!a.licensedOnly
        });
      }
      saveState();
    }
    if (!state.media) state.media = [];

    renderCategorySelect();
    renderDashboard();
    renderCategories();
    renderMedia();
    bindStaticUI();
  }

  // ─── Dashboard ───
  function renderDashboard() {
    const tbody = document.getElementById('pub-table-body');
    const empty = document.getElementById('pub-empty');
    if (!state.publications.length) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = state.publications.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.title || '(untitled)')}</strong></td>
        <td>${escapeHtml(p.categoryLabel || p.category || '—')}</td>
        <td>${escapeHtml(p.date || '—')}</td>
        <td>${p.bodyMode === 'attachments' ? 'PDF/Doc' : 'Markdown'}${p.externalUrl ? ' + link' : ''}</td>
        <td>
          <div class="studio-row-actions">
            <button class="studio-btn-edit" data-edit="${p.id}"><i class="ri-edit-line"></i> Edit</button>
            <button class="studio-btn-delete" data-delete="${p.id}"><i class="ri-delete-bin-line"></i> Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openEditor(parseInt(btn.dataset.edit, 10)));
    });
    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Remove this publication from your draft?')) return;
        state.publications = state.publications.filter(p => p.id !== parseInt(btn.dataset.delete, 10));
        saveState();
        renderDashboard();
        toast('Removed from draft.');
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ─── Editor ───
  function resetForm() {
    editingId = null;
    formTags = [];
    formCover = null;
    formPdf = null;
    formDocx = null;
    slugManuallyEdited = false;
    document.getElementById('editor-heading').textContent = 'New Publication';
    document.getElementById('f-title').value = '';
    document.getElementById('f-slug').value = '';
    document.getElementById('f-date').value = '';
    document.getElementById('f-readtime').value = '';
    document.getElementById('f-external').value = '';
    document.getElementById('f-excerpt').value = '';
    document.getElementById('f-body').value = '';
    document.getElementById('f-body-attach').value = '';
    document.getElementById('cover-preview').style.display = 'none';
    document.getElementById('cover-preview').innerHTML = '';
    document.getElementById('pdf-preview').style.display = 'none';
    document.getElementById('pdf-preview').innerHTML = '';
    document.getElementById('docx-preview').style.display = 'none';
    document.getElementById('docx-preview').innerHTML = '';
    renderTagChips();
    setMode('markdown');
    renderCategorySelect();
  }

  async function openEditor(id) {
    const p = state.publications.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    slugManuallyEdited = true;
    formTags = [...(p.tags || [])];
    formCover = p.coverFileId ? { fileId: p.coverFileId, filename: p.coverFilename } : null;
    formPdf = p.pdfFileId ? { fileId: p.pdfFileId, filename: p.pdfFilename } : null;
    formDocx = p.docxFileId ? { fileId: p.docxFileId, filename: p.docxFilename } : null;

    document.getElementById('editor-heading').textContent = 'Edit Publication';
    document.getElementById('f-title').value = p.title || '';
    document.getElementById('f-slug').value = p.slug || '';
    document.getElementById('f-date').value = p.date || '';
    document.getElementById('f-readtime').value = p.readTime || '';
    document.getElementById('f-external').value = p.externalUrl || '';
    document.getElementById('f-excerpt').value = p.excerpt || '';
    document.getElementById('f-body').value = p.body || '';
    document.getElementById('f-body-attach').value = p.bodyMode === 'attachments' ? (p.body || '') : '';
    renderCategorySelect(p.category);
    renderTagChips();
    setMode(p.bodyMode || 'markdown');

    const coverPrev = document.getElementById('cover-preview');
    if (formCover) {
      const blob = await getFile(formCover.fileId);
      if (blob) showFilePreview(coverPrev, URL.createObjectURL(blob), formCover.filename, 'cover');
    } else if (p.image) {
      coverPrev.style.display = 'flex';
      coverPrev.innerHTML = `<img src="${p.image}" alt=""><span>Current image (external URL)</span>`;
    }
    if (formPdf) {
      const blob = await getFile(formPdf.fileId);
      if (blob) showFilePreview(document.getElementById('pdf-preview'), null, formPdf.filename, 'pdf');
    }
    if (formDocx) {
      showFilePreview(document.getElementById('docx-preview'), null, formDocx.filename, 'docx');
    }

    switchTab('editor');
  }

  function showFilePreview(container, imgUrl, filename, kind) {
    container.style.display = 'flex';
    container.innerHTML = (imgUrl ? `<img src="${imgUrl}" alt="">` : `<i class="ri-file-line" style="font-size:1.5rem;"></i>`) +
      `<span>${escapeHtml(filename)}</span> <span class="remove-file" data-remove="${kind}">Remove</span>`;
    container.querySelector('[data-remove]').addEventListener('click', () => {
      if (kind === 'cover') { formCover = null; }
      if (kind === 'pdf') { formPdf = null; }
      if (kind === 'docx') { formDocx = null; }
      container.style.display = 'none';
      container.innerHTML = '';
    });
  }

  function renderTagChips() {
    const wrap = document.getElementById('f-tags-wrap');
    const input = document.getElementById('f-tags-input');
    wrap.querySelectorAll('.studio-tag-chip').forEach(el => el.remove());
    formTags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'studio-tag-chip';
      chip.innerHTML = `${escapeHtml(tag)} <span class="remove" data-i="${i}">×</span>`;
      wrap.insertBefore(chip, input);
    });
    wrap.querySelectorAll('.remove').forEach(el => {
      el.addEventListener('click', () => {
        formTags.splice(parseInt(el.dataset.i, 10), 1);
        renderTagChips();
      });
    });
  }

  function setMode(mode) {
    document.querySelectorAll('.studio-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.getElementById('mode-markdown').style.display = mode === 'markdown' ? '' : 'none';
    document.getElementById('mode-attachments').style.display = mode === 'attachments' ? '' : 'none';
  }

  function renderCategorySelect(selected) {
    const sel = document.getElementById('f-category');
    sel.innerHTML = state.categories.map(c => `<option value="${c.slug}">${escapeHtml(c.label)}</option>`).join('');
    if (selected) sel.value = selected;
  }

  function saveEditor() {
    const title = document.getElementById('f-title').value.trim();
    if (!title) { toast('Give it a title first.'); return; }
    let slug = slugify(document.getElementById('f-slug').value || title);
    if (!slug) { toast('Could not generate a slug — try a different title.'); return; }

    const mode = document.querySelector('.studio-mode-btn.active').dataset.mode;
    const catSel = document.getElementById('f-category');
    const catLabel = catSel.options[catSel.selectedIndex] ? catSel.options[catSel.selectedIndex].text : '';
    const body = mode === 'markdown' ? document.getElementById('f-body').value : document.getElementById('f-body-attach').value;
    const readTime = document.getElementById('f-readtime').value.trim() || (mode === 'markdown' ? estimateReadTime(body) : '');

    const entry = {
      id: editingId || nextPubId(),
      slug, title,
      category: catSel.value,
      categoryLabel: catLabel,
      date: document.getElementById('f-date').value.trim(),
      readTime,
      excerpt: document.getElementById('f-excerpt').value.trim(),
      tags: [...formTags],
      image: formCover ? null : (state.publications.find(p => p.id === editingId) || {}).image || null,
      coverFileId: formCover ? formCover.fileId : null,
      coverFilename: formCover ? formCover.filename : null,
      externalUrl: document.getElementById('f-external').value.trim(),
      bodyMode: mode,
      body,
      pdfFileId: formPdf ? formPdf.fileId : null,
      pdfFilename: formPdf ? formPdf.filename : null,
      docxFileId: formDocx ? formDocx.fileId : null,
      docxFilename: formDocx ? formDocx.filename : null,
      existingAttachments: (state.publications.find(p => p.id === editingId) || {}).existingAttachments || [],
      licensedOnly: (state.publications.find(p => p.id === editingId) || {}).licensedOnly || false
    };
    if (!entry.image && !formCover) {
      entry.image = 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80'; // sensible default
    }

    const idx = state.publications.findIndex(p => p.id === entry.id);
    if (idx >= 0) state.publications[idx] = entry; else state.publications.push(entry);
    saveState();
    renderDashboard();
    toast('Saved to draft.');
    switchTab('dashboard');
  }

  // ─── Categories ───
  function renderCategories() {
    const wrap = document.getElementById('category-list');
    wrap.innerHTML = state.categories.map((c, i) => `
      <div class="studio-category-row">
        <input type="text" data-i="${i}" data-field="label" value="${escapeHtml(c.label)}">
        <span class="hint" style="font-size:0.75rem; color:var(--mid-grey); white-space:nowrap;">${escapeHtml(c.slug)}</span>
        <button class="studio-btn-delete" data-del-cat="${i}"><i class="ri-delete-bin-line"></i></button>
      </div>
    `).join('');
    wrap.querySelectorAll('input[data-field="label"]').forEach(inp => {
      inp.addEventListener('change', () => {
        const i = parseInt(inp.dataset.i, 10);
        state.categories[i].label = inp.value;
        saveState();
        renderCategorySelect();
      });
    });
    wrap.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this category? Publications using it will need a new one assigned.')) return;
        state.categories.splice(parseInt(btn.dataset.delCat, 10), 1);
        saveState();
        renderCategories();
        renderCategorySelect();
      });
    });
  }

  // ─── Media Library ───
  async function renderMedia() {
    const grid = document.getElementById('media-grid');
    const empty = document.getElementById('media-empty');
    if (!state.media.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = '';
    for (const m of state.media) {
      const blob = await getFile(m.id);
      const url = blob ? URL.createObjectURL(blob) : '';
      const item = document.createElement('div');
      item.className = 'studio-media-item';
      item.innerHTML = `<img src="${url}" alt="${escapeHtml(m.filename)}">
        <div class="meta">${escapeHtml(m.filename)}<br><button data-copy="images/uploads/${escapeHtml(m.filename)}">Copy path</button> · <button data-del-media="${m.id}">Delete</button></div>`;
      grid.appendChild(item);
    }
    grid.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy).then(() => toast('Path copied.'));
      });
    });
    grid.querySelectorAll('[data-del-media]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.media = state.media.filter(m => m.id !== btn.dataset.delMedia);
        saveState();
        renderMedia();
      });
    });
  }

  // ─── Export ───
  async function exportBundle() {
    if (!window.JSZip) { toast('Export library failed to load — check your connection.'); return; }
    toast('Building export…');
    const zip = new JSZip();
    const articlesOut = [];
    const fallbackOut = [];

    for (const p of state.publications) {
      const entry = {
        id: p.id, slug: p.slug, title: p.title, category: p.category, categoryLabel: p.categoryLabel,
        date: p.date, readTime: p.readTime, excerpt: p.excerpt, tags: p.tags, featured: true
      };
      if (p.licensedOnly) entry.licensedOnly = true;

      if (p.coverFileId) {
        const blob = await getFile(p.coverFileId);
        if (blob) {
          zip.file(`images/uploads/${p.coverFilename}`, blob);
          entry.image = `images/uploads/${p.coverFilename}`;
        }
      } else if (p.image) {
        entry.image = p.image;
      }

      if (p.externalUrl) entry.externalUrl = p.externalUrl;

      if (p.bodyMode === 'markdown' && p.body && p.body.trim()) {
        const mdPath = `content/articles/${p.slug}.md`;
        zip.file(mdPath, p.body);
        entry.mdFile = mdPath;
      }

      const attachments = [];
      if (p.pdfFileId) {
        const blob = await getFile(p.pdfFileId);
        if (blob) {
          const path = `content/attachments/${p.slug}.pdf`;
          zip.file(path, blob);
          attachments.push({ type: 'pdf', path, label: 'Download PDF' });
        }
      }
      if (p.docxFileId) {
        const blob = await getFile(p.docxFileId);
        if (blob) {
          const path = `content/attachments/${p.slug}.docx`;
          zip.file(path, blob);
          attachments.push({ type: 'docx', path, label: 'Download Word Document' });
        }
      }
      if (attachments.length) entry.attachments = attachments;
      if (p.bodyMode === 'attachments' && p.body && p.body.trim() && !entry.mdFile) {
        // short intro text for an attachments-based entry — store as excerpt extension via a tiny md file
        const mdPath = `content/articles/${p.slug}.md`;
        zip.file(mdPath, p.body);
        entry.mdFile = mdPath;
      }

      articlesOut.push(entry);
      const fallbackEntry = { ...entry };
      if (entry.mdFile) fallbackEntry.content = p.body;
      fallbackOut.push(fallbackEntry);
    }

    // Extra media library images not used as a cover elsewhere
    for (const m of state.media) {
      const blob = await getFile(m.id);
      if (blob) zip.file(`images/uploads/${m.filename}`, blob);
    }

    zip.file('content/articles.json', JSON.stringify(articlesOut, null, 2));

    const fallbackJs = "// Auto-generated by Admin Studio — offline fallback bundle.\n" +
      "// The live site fetches content/articles.json directly; this file is\n" +
      "// only used when the page is opened without a server (file://).\n" +
      "window.KOLOUCH_ARTICLES_FALLBACK = " + JSON.stringify(fallbackOut, null, 2) + ";\n";
    zip.file('js/articles-data.js', fallbackJs);

    const categoryButtons = state.categories.map(c =>
      `<button class="filter-btn" data-category="${c.slug}">${c.label}</button>`
    ).join('\n');

    const readme = `KOLOUCH RESEARCH — EXPORT BUNDLE
Generated: ${new Date().toISOString()}

WHAT'S IN HERE
- content/articles.json         → replaces the file of the same name in your repo
- js/articles-data.js           → replaces the file of the same name in your repo
- content/articles/*.md         → new/updated article bodies — add to content/articles/
- content/attachments/*         → uploaded PDF/Word files — add to content/attachments/
- images/uploads/*              → uploaded cover images and media library files — add to images/uploads/

HOW TO PUBLISH
1. Unzip this bundle.
2. In your GitHub repo, replace content/articles.json and js/articles-data.js with the
   versions in this bundle (drag and drop on github.com, or copy over locally and push).
3. Add any new files under content/articles/, content/attachments/, and images/uploads/
   (create those folders if they don't exist yet).
4. Commit. Vercel redeploys automatically.

CATEGORIES
Your current category list is below. If you added a NEW category that wasn't already a
filter button on research.html / publications.html, copy this block and replace the
existing <div class="filter-bar">...</div> contents (keeping the "All" button) in both files:

${categoryButtons}
`;
    zip.file('README-CHANGES.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kolouch-research-export-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Export ready — check your downloads.');
  }

  // ─── Static UI bindings ───
  function switchTab(name) {
    document.querySelectorAll('.studio-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === name));
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  }

  function bindStaticUI() {
    document.querySelectorAll('.studio-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.panel));
    });

    document.getElementById('new-pub-btn').addEventListener('click', () => { resetForm(); switchTab('editor'); });
    document.getElementById('cancel-edit-btn').addEventListener('click', () => { resetForm(); switchTab('dashboard'); });
    document.getElementById('save-pub-btn').addEventListener('click', saveEditor);

    document.getElementById('f-title').addEventListener('input', (e) => {
      if (!slugManuallyEdited) document.getElementById('f-slug').value = slugify(e.target.value);
    });
    document.getElementById('f-slug').addEventListener('input', () => { slugManuallyEdited = true; });

    document.getElementById('f-tags-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        formTags.push(e.target.value.trim());
        e.target.value = '';
        renderTagChips();
      }
    });

    document.querySelectorAll('.studio-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Cover upload
    const coverZone = document.getElementById('cover-upload-zone');
    const coverInput = document.getElementById('f-cover-file');
    coverZone.addEventListener('click', () => coverInput.click());
    coverInput.addEventListener('change', async () => {
      const file = coverInput.files[0];
      if (!file) return;
      const id = 'cover-' + uid();
      await putFile(id, file);
      formCover = { fileId: id, filename: file.name };
      showFilePreview(document.getElementById('cover-preview'), URL.createObjectURL(file), file.name, 'cover');
    });

    // PDF upload
    const pdfZone = document.getElementById('pdf-upload-zone');
    const pdfInput = document.getElementById('f-pdf-file');
    pdfZone.addEventListener('click', () => pdfInput.click());
    pdfInput.addEventListener('change', async () => {
      const file = pdfInput.files[0];
      if (!file) return;
      const id = 'pdf-' + uid();
      await putFile(id, file);
      formPdf = { fileId: id, filename: file.name };
      showFilePreview(document.getElementById('pdf-preview'), null, file.name, 'pdf');
    });

    // Word doc upload
    const docxZone = document.getElementById('docx-upload-zone');
    const docxInput = document.getElementById('f-docx-file');
    docxZone.addEventListener('click', () => docxInput.click());
    docxInput.addEventListener('change', async () => {
      const file = docxInput.files[0];
      if (!file) return;
      const id = 'docx-' + uid();
      await putFile(id, file);
      formDocx = { fileId: id, filename: file.name };
      showFilePreview(document.getElementById('docx-preview'), null, file.name, 'docx');
    });

    // Categories
    document.getElementById('add-cat-btn').addEventListener('click', () => {
      const input = document.getElementById('new-cat-label');
      const label = input.value.trim();
      if (!label) return;
      const slug = slugify(label);
      if (state.categories.some(c => c.slug === slug)) { toast('That category already exists.'); return; }
      state.categories.push({ slug, label });
      input.value = '';
      saveState();
      renderCategories();
      renderCategorySelect();
    });

    // Media library
    const mediaInput = document.getElementById('media-file-input');
    document.getElementById('media-upload-btn').addEventListener('click', () => mediaInput.click());
    mediaInput.addEventListener('change', async () => {
      for (const file of mediaInput.files) {
        const id = 'media-' + uid();
        await putFile(id, file);
        state.media.push({ id, filename: file.name });
      }
      saveState();
      renderMedia();
      mediaInput.value = '';
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', exportBundle);

    resetForm();
  }

  document.addEventListener('DOMContentLoaded', initGate);
})();
