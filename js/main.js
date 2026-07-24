
/**
 * Goran Kolouch — Premium Research Website
 * JavaScript — Interactive Engine
 */

(function() {
  'use strict';

  // ─── DOM Ready ───
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initTheme();
    initNavigation();
    initScrollAnimations();
    initBackToTop();
    initMobileMenu();
    initSearch();
    initFilters();
    initPageTransitions();
    initLazyLoading();
    initContactForm();
    initNewsletterForm();
    initAdminPanel();
    initPublicationData();
    initFAQ();
    initGalleryLightbox();
  }

  // ─── FAQ Accordion ───
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const wasOpen = item.classList.contains('open');
        item.parentElement.querySelectorAll('.faq-item.open').forEach(el => {
          el.classList.remove('open');
          el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // ─── Gallery Lightbox ───
  function initGalleryLightbox() {
    const items = document.querySelectorAll('.gallery-item');
    if (!items.length) return;

    let lightbox = document.querySelector('.lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'lightbox';
      lightbox.innerHTML = '<button class="lightbox-close" aria-label="Close"><i class="ri-close-line"></i></button><img src="" alt="">';
      document.body.appendChild(lightbox);
    }
    const lbImg = lightbox.querySelector('img');
    const closeBtn = lightbox.querySelector('.lightbox-close');

    items.forEach(item => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lightbox.classList.add('open');
      });
    });

    function close() { lightbox.classList.remove('open'); }
    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // ─── Theme Toggle (Dark/Light Mode) ───
  function initTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';

    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
      });
    }
  }

  function updateThemeIcon(theme) {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;

    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
    }
  }

  // ─── Navigation ───
  function initNavigation() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;

      if (currentScroll > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

      // Highlight active nav link based on scroll position
      highlightActiveNavLink();

      lastScroll = currentScroll;
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const navHeight = navbar.offsetHeight;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  function highlightActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    let currentSection = '';
    const scrollPos = window.pageYOffset + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + currentSection) {
        link.classList.add('active');
      }
    });
  }

  // ─── Scroll Animations ───
  function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    fadeElements.forEach(el => observer.observe(el));
  }

  // ─── Back to Top ───
  function initBackToTop() {
    const backToTop = document.querySelector('.back-to-top');
    if (!backToTop) return;

    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });

    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ─── Mobile Menu ───
  function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ─── Search Functionality ───
  function initSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce(function() {
      const query = this.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.research-card');

      cards.forEach(card => {
        const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
        const excerpt = card.querySelector('.card-excerpt')?.textContent.toLowerCase() || '';
        const category = card.querySelector('.card-category')?.textContent.toLowerCase() || '';

        if (title.includes(query) || excerpt.includes(query) || category.includes(query)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });

      updateResultsCount();
    }, 300));
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function updateResultsCount() {
    const visibleCards = document.querySelectorAll('.research-card:not([style*="display: none"])');
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${visibleCards.length} publication${visibleCards.length !== 1 ? 's' : ''} found`;
    }
  }

  // ─── Category Filters ───
  function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.dataset.category;
        const cards = document.querySelectorAll('.research-card');

        cards.forEach(card => {
          if (category === 'all' || card.dataset.category === category) {
            card.style.display = '';
            card.style.animation = 'fadeIn 0.4s ease';
          } else {
            card.style.display = 'none';
          }
        });

        updateResultsCount();
      });
    });
  }

  // ─── Page Transitions ───
  function initPageTransitions() {
    const transition = document.querySelector('.page-transition');
    if (!transition) return;

    document.querySelectorAll('a[href]:not([href^="#"]):not([href^="mailto"]):not([href^="tel"])').forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && !href.startsWith('http')) {
          e.preventDefault();
          transition.classList.add('active');

          setTimeout(() => {
            window.location.href = href;
          }, 400);
        }
      });
    });

    window.addEventListener('pageshow', () => {
      transition.classList.remove('active');
      transition.classList.remove('exit');
    });
  }

  // ─── Lazy Loading ───
  function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px'
    });

    lazyImages.forEach(img => imageObserver.observe(img));
  }

  // ─── Contact Form ───
  function initContactForm() {
    const form = document.querySelector('.contact-form form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      // Validate
      const name = form.querySelector('[name="name"]')?.value.trim();
      const email = form.querySelector('[name="email"]')?.value.trim();
      const message = form.querySelector('[name="message"]')?.value.trim();

      if (!name || !email || !message) {
        showNotification('Please fill in all required fields.', 'error');
        return;
      }

      if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
      }

      // Simulate sending
      btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Sending...';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        form.reset();
        showNotification('Thank you for your message. I will respond shortly.', 'success');
      }, 1500);
    });
  }

  // ─── Newsletter Form ───
  function initNewsletterForm() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const email = form.querySelector('input[type="email"]')?.value.trim();
      const btn = form.querySelector('button');

      if (!email || !isValidEmail(email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
      }

      btn.innerHTML = '<i class="ri-check-line"></i> Subscribed';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = 'Subscribe';
        btn.disabled = false;
        form.reset();
        showNotification('You have been subscribed to the newsletter.', 'success');
      }, 1500);
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="ri-${type === 'success' ? 'check-circle' : type === 'error' ? 'error-warning' : 'information'}-line"></i>
      <span>${message}</span>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 2rem;
      background: ${type === 'success' ? '#1B2128' : type === 'error' ? '#B0413E' : '#1B2128'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9375rem;
      font-weight: 500;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideInRight 0.4s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.4s ease forwards';
      setTimeout(() => notification.remove(), 400);
    }, 4000);
  }

  // ─── Admin Panel ───
  function initAdminPanel() {
    // Admin login simulation
    const adminLoginForm = document.querySelector('.admin-login-form');
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const password = this.querySelector('input[type="password"]').value;

        if (password === 'admin123') { // Demo password
          localStorage.setItem('adminLoggedIn', 'true');
          window.location.href = 'admin/dashboard.html';
        } else {
          showNotification('Invalid password.', 'error');
        }
      });
    }

    // Check admin auth
    const adminPages = document.querySelectorAll('.admin-page');
    if (adminPages.length && !localStorage.getItem('adminLoggedIn')) {
      window.location.href = 'index.html';
    }

    // Admin logout
    const logoutBtn = document.querySelector('.admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminLoggedIn');
        window.location.href = '../index.html';
      });
    }

    // File upload preview
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.addEventListener('change', function() {
        const preview = this.closest('.form-group')?.querySelector('.file-preview');
        if (preview && this.files[0]) {
          preview.textContent = `Selected: ${this.files[0].name}`;
          preview.style.color = 'var(--ink)';
        }
      });
    });

    // Delete confirmation
    document.querySelectorAll('.admin-btn-delete').forEach(btn => {
      btn.addEventListener('click', function(e) {
        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
          e.preventDefault();
        }
      });
    });
  }

  // ─── Publication Data (loaded from /content/articles.json,
  //     falling back to an embedded bundle if fetch is unavailable —
  //     e.g. the page was opened directly from disk rather than served) ───
  async function initPublicationData() {
    const container = document.querySelector('.research-grid');
    if (!container) return; // nothing to render on this page

    try {
      const res = await fetch('content/articles.json');
      if (!res.ok) throw new Error('articles.json ' + res.status);
      window.publications = await res.json();
    } catch (err) {
      if (window.KOLOUCH_ARTICLES_FALLBACK) {
        window.publications = window.KOLOUCH_ARTICLES_FALLBACK;
      } else {
        container.innerHTML = '<p class="state-message">Could not load articles.</p>';
        return;
      }
    }

    renderPublications();
  }

  function renderPublications() {
    const container = document.querySelector('.research-grid');
    if (!container || !window.publications) return;

    let list = window.publications;
    if (container.dataset.mode === 'featured') {
      list = list.filter(p => p.featured);
    }
    const limit = parseInt(container.dataset.limit, 10);
    if (limit) list = list.slice(0, limit);

    if (!list.length) {
      container.innerHTML = '<p class="state-message">No articles yet. Add one to content/articles.json to see it here.</p>';
      return;
    }

    container.innerHTML = list.map(pub => {
      const internal = !!pub.mdFile;
      const href = internal ? `article.html?slug=${pub.slug}` : (pub.externalUrl || `article.html?slug=${pub.slug}`);
      const external = !internal && !!pub.externalUrl;
      return `
      <article class="card research-card" data-category="${pub.category}" data-id="${pub.id}" style="position:relative;">
        ${pub.licensedOnly ? '<span class="card-badge-licensed"><i class="ri-lock-2-line"></i> Licensed</span>' : ''}
        <div style="overflow: hidden; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
          <img src="${pub.image}" alt="${pub.title}" class="card-image" loading="lazy">
        </div>
        <div class="card-body">
          <div class="card-category">${pub.categoryLabel}</div>
          <h3 class="card-title">${pub.title}</h3>
          <p class="card-excerpt">${pub.excerpt}</p>
          <div class="card-meta">
            <span><i class="ri-calendar-line"></i> ${pub.date}</span>
            <span><i class="ri-time-line"></i> ${pub.readTime}</span>
          </div>
          <div class="tags" style="margin-top: 1rem;">
            ${pub.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <div style="margin-top: 1.25rem; display: flex; gap: 0.75rem;">
            <a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''} class="btn btn-sm btn-primary">
              ${external ? 'Read on LinkedIn' : (pub.licensedOnly ? 'View Summary' : 'Read Article')}
            </a>
          </div>
        </div>
      </article>
    `;
    }).join('');

    updateResultsCount();
    applyCategoryFromURL();
  }

  // Supports links like research.html?category=platform-accountability
  function applyCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (!category) return;
    const btn = document.querySelector(`.filter-btn[data-category="${category}"]`);
    if (btn) btn.click();
  }

  // Global functions
  window.downloadPDF = function(id) {
    showNotification('PDF download started.', 'success');
    // In production, this would trigger actual PDF download
  };

  window.sharePublication = function(platform, id) {
    const pub = window.publications?.find(p => p.id === id);
    if (!pub) return;

    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(pub.title);

    let shareUrl = '';
    switch(platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // Add CSS animation keyframes dynamically
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ri-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

})();
