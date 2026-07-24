/**
 * Goran Kolouch — Article detail page loader.
 * Reads ?slug=... from the URL, looks it up in
 * content/articles.json, and renders the matching
 * entry — pulling the full body from its Markdown
 * file when one is listed.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function getSlug() {
    return new URLSearchParams(window.location.search).get('slug');
  }

  // Converts "July 2026" -> "2026-07-01" for schema.org datePublished.
  // Falls back to the raw string if it doesn't match (still better than nothing).
  function toISODate(dateStr) {
    if (!dateStr) return undefined;
    const months = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
      july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };
    const m = dateStr.trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
    if (m && months[m[1]]) return `${m[2]}-${months[m[1]]}-01`;
    return dateStr;
  }

  async function init() {
    const slug = getSlug();
    const contentEl = document.getElementById('pub-content');

    let articles;
    try {
      const res = await fetch('content/articles.json');
      if (!res.ok) throw new Error('articles.json ' + res.status);
      articles = await res.json();
    } catch (err) {
      articles = window.KOLOUCH_ARTICLES_FALLBACK || null;
    }

    if (!articles) {
      contentEl.innerHTML = '<p>Could not load article data.</p>';
      return;
    }

    const article = articles.find(a => a.slug === slug);
    if (!article) {
      document.getElementById('pub-title').textContent = 'Article not found';
      document.getElementById('pub-category').textContent = 'Not found';
      contentEl.innerHTML = '<p>No article matches this link. <a href="publications.html">Browse all publications →</a></p>';
      return;
    }

    document.title = article.title + ' — Goran Kolouch';
    document.getElementById('page-title').textContent = article.title + ' — Goran Kolouch';
    document.getElementById('pub-title').textContent = article.title;
    document.getElementById('pub-category').textContent = article.categoryLabel;
    document.getElementById('pub-date').textContent = article.date;
    document.getElementById('pub-readtime').textContent = article.readTime;

    if (article.image) {
      const wrap = document.getElementById('pub-cover-wrap');
      const cover = document.getElementById('pub-cover');
      const webpSource = document.getElementById('pub-cover-webp');
      cover.src = article.image.replace('w=800', 'w=1200');
      cover.alt = article.title;
      // Local images (images/uploads/... or images/cover-...) ship a matching
      // .webp sibling from the Studio/build step; remote (Unsplash) URLs don't.
      if (/^images\//.test(article.image) && /\.(jpg|jpeg|png)$/i.test(article.image)) {
        webpSource.srcset = article.image.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      } else {
        webpSource.srcset = '';
      }
      wrap.style.display = '';
    }

    // Body: prefer a live-fetched Markdown file; fall back to the
    // embedded copy bundled in article.content, then the excerpt.
    let mdText = article.content || null;
    if (article.mdFile && !mdText) {
      try {
        const mdRes = await fetch(article.mdFile);
        if (!mdRes.ok) throw new Error('md ' + mdRes.status);
        mdText = await mdRes.text();
      } catch (err) {
        mdText = null;
      }
    } else if (article.mdFile) {
      // We have an embedded copy already; still try to fetch the live
      // version in case it's newer, but don't block on it.
      try {
        const mdRes = await fetch(article.mdFile);
        if (mdRes.ok) mdText = await mdRes.text();
      } catch (err) { /* keep embedded copy */ }
    }

    if (mdText) {
      contentEl.innerHTML = window.marked ? marked.parse(mdText) : mdText.split('\n\n').map(p => `<p>${p}</p>`).join('');
    } else if (article.externalUrl) {
      contentEl.innerHTML = `<p>${article.excerpt}</p><p>The full piece is published on LinkedIn.</p>`;
    } else {
      contentEl.innerHTML = `<p>${article.excerpt}</p>`;
    }

    // Tags
    const tagsEl = document.getElementById('pub-tags');
    if (article.tags && article.tags.length) {
      tagsEl.innerHTML = article.tags.map(t => `<span class="tag">${t}</span>`).join('');
    }

    // Attached source documents (PDF / Word), if any were uploaded via the admin studio
    if (article.attachments && article.attachments.length) {
      const resWrap = document.getElementById('pub-resources');
      const list = document.getElementById('pub-resources-list');
      list.innerHTML = article.attachments.map(att => {
        const icon = att.type === 'pdf' ? 'ri-file-pdf-2-line' : 'ri-file-word-2-line';
        return `<a href="${att.path}" download class="resource-link"><i class="${icon}"></i> ${att.label || (att.type === 'pdf' ? 'Download PDF' : 'Download Word Document')}</a>`;
      }).join('');
      resWrap.style.display = '';

      const pdfAtt = article.attachments.find(a => a.type === 'pdf');
      if (pdfAtt) {
        document.getElementById('pub-pdf-viewer').src = pdfAtt.path;
        document.getElementById('pub-pdf-viewer-wrap').style.display = '';
      }
    }

    // Open Graph + meta description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', article.title + ' — Goran Kolouch');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', article.excerpt);
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', article.excerpt);
    if (article.image) {
      let ogImg = document.querySelector('meta[property="og:image"]');
      if (!ogImg) {
        ogImg = document.createElement('meta');
        ogImg.setAttribute('property', 'og:image');
        document.head.appendChild(ogImg);
      }
      ogImg.setAttribute('content', article.image);
    }

    // Structured data (schema.org Article)
    const jsonld = document.getElementById('article-jsonld');
    if (jsonld) {
      jsonld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.excerpt,
        "image": article.image || undefined,
        "datePublished": toISODate(article.date),
        "author": { "@type": "Person", "name": "Goran Kolouch", "url": "https://kolouch.pro/about.html" },
        "publisher": { "@type": "Person", "name": "Goran Kolouch" },
        "keywords": (article.tags || []).join(', ')
      });
    }

    // Licensed-only notice (e.g. a memorandum whose full text isn't published)
    if (article.licensedOnly) {
      const notice = document.createElement('div');
      notice.className = 'license-notice fade-in';
      notice.style.maxWidth = '700px';
      notice.style.margin = '0 auto 2rem';
      notice.innerHTML = `
        <div class="license-notice-inner">
          <i class="ri-lock-2-line"></i>
          <div>
            <strong>Licensed material</strong>
            <p>The full memorandum is not published here — it's available for direct licensing to regulators, law firms, and institutions.</p>
          </div>
          <a href="mailto:inquiries@kolouch.pro?subject=Licensing%20Inquiry%3A%20${encodeURIComponent(article.title)}" class="btn btn-sm btn-primary">Request Licensing</a>
        </div>
      `;
      contentEl.insertAdjacentElement('afterend', notice);
    }

    // Actions
    const actions = document.getElementById('pub-actions');
    let actionsHtml = '';
    if (article.externalUrl) {
      actionsHtml += `<a href="${article.externalUrl}" target="_blank" rel="noopener" class="btn btn-primary"><i class="ri-linkedin-line"></i> Read the Full Article on LinkedIn</a>`;
    }
    actionsHtml += `<button class="btn btn-outline" onclick="window.print()"><i class="ri-printer-line"></i> Print</button>`;
    actionsHtml += `<button class="btn btn-outline" onclick="sharePublication('linkedin', ${article.id})"><i class="ri-linkedin-line"></i> Share</button>`;
    actions.innerHTML = actionsHtml;

    // Related articles: up to two others
    const related = articles.filter(a => a.slug !== article.slug).slice(0, 2);
    if (related.length) {
      const grid = document.getElementById('related-grid');
      grid.innerHTML = related.map(rel => {
        const href = rel.mdFile ? `article.html?slug=${rel.slug}` : (rel.externalUrl || `article.html?slug=${rel.slug}`);
        const external = !rel.mdFile && !!rel.externalUrl;
        return `
        <article class="card research-card">
          <div style="overflow: hidden; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
            <img src="${rel.image}" alt="${rel.title}" class="card-image" loading="lazy">
          </div>
          <div class="card-body">
            <div class="card-category">${rel.categoryLabel}</div>
            <h3 class="card-title"><a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${rel.title}</a></h3>
            <p class="card-excerpt">${rel.excerpt}</p>
            <div class="card-meta">
              <span><i class="ri-calendar-line"></i> ${rel.date}</span>
              <span><i class="ri-time-line"></i> ${rel.readTime}</span>
            </div>
          </div>
        </article>`;
      }).join('');
      document.getElementById('related-wrap').style.display = '';
    }

    // Re-run fade-in observer for newly injected content
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }
})();
