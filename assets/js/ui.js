/*
  SMART SHOP MANAGEMENT SYSTEM
  UI Helpers (toasts, loading, modals, sidebar + theme)
*/

(function () {
  const toastContainerId = 'toastContainer';

  function ensureToastContainer() {
    let el = document.getElementById(toastContainerId);
    if (!el) {
      el = document.createElement('div');
      el.id = toastContainerId;
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  function toast({ type = 'info', title = '', message = '' } = {}) {
    const container = ensureToastContainer();

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;

    toastEl.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '⚠️' : type === 'warning' ? '🟠' : 'ℹ️'}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" type="button" aria-label="Close">✕</button>
    `;

    const closeBtn = toastEl.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => toastEl.remove());

    container.appendChild(toastEl);

    // Auto dismiss
    setTimeout(() => {
      if (toastEl.parentElement) toastEl.remove();
    }, 3500);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function showLoading() {
    let el = document.getElementById('globalLoadingOverlay');
    if (el) return;

    el = document.createElement('div');
    el.id = 'globalLoadingOverlay';
    el.className = 'loading-overlay';
    el.innerHTML = `<div class="loading-spinner" aria-label="Loading"></div>`;
    document.body.appendChild(el);
  }

  function hideLoading() {
    const el = document.getElementById('globalLoadingOverlay');
    if (el) el.remove();
  }

  function bindCommonSidebarAndTheme() {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    const btnDarkMode = document.getElementById('btnDarkMode');
    if (btnDarkMode) {
      const theme = localStorage.getItem('theme') || 'light';
      if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

      btnDarkMode.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('theme', 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('theme', 'dark');
        }
      });
    }
  }

  function bindLogout() {
    const btnLogout = document.getElementById('btnLogout');
    if (!btnLogout) return;

    btnLogout.addEventListener('click', async () => {
      localStorage.removeItem('token');
      try {
        const lastSlashIndex = window.location.pathname.lastIndexOf('/');
        const folderPath = window.location.pathname.substring(0, lastSlashIndex);
        await fetch((folderPath === '/' ? '' : folderPath) + '/api/auth/logout.php', { method: 'POST' });
      } catch (e) {}
      window.location.href = 'login.php';
    });
  }

  // Expose globally
  window.Ui = {
    toast,
    showLoading,
    hideLoading,
    bindCommonSidebarAndTheme,
    bindLogout
  };
})();
