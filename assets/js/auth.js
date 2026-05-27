/*
  SMART SHOP MANAGEMENT SYSTEM
  Auth UI logic (Login/Register + JWT in localStorage)
*/

(function () {
  function getTokenOrNull() {
    return localStorage.getItem('token');
  }

  function requireAuthRedirect() {
    const token = getTokenOrNull();
    if (!token) {
      window.location.href = 'login.php';
      return false;
    }
    return true;
  }

  function decodeRoleFromToken() {
    const token = getTokenOrNull();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role;
    } catch {
      return null;
    }
  }

  function updateHeaderUser() {
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if (!nameEl || !roleEl) return;

    const token = getTokenOrNull();
    if (!token) {
      nameEl.textContent = '—';
      roleEl.textContent = '—';
      return;
    }

    const role = decodeRoleFromToken();
    roleEl.textContent = role ? String(role) : '—';
    nameEl.textContent = 'User';
  }

  async function initLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // Clear errors
    const setError = (id, msg) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg || '';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      setError('emailError', '');
      setError('passwordError', '');

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email) return setError('emailError', 'Email is required');
      if (!password) return setError('passwordError', 'Password is required');

      try {
        Ui.showLoading();
        const res = await Api.login({ email, password });
        // Token stored after login
        localStorage.setItem('token', res.data.token);
        
        // Also save to a session-cookie in PHP by submitting a hidden form or fetch
        // To keep it simple and robust, we fetch a helper endpoint to set the PHP session!
        const lastSlashIndex = window.location.pathname.lastIndexOf('/');
        const folderPath = window.location.pathname.substring(0, lastSlashIndex);
        
        await fetch((folderPath === '/' ? '' : folderPath) + '/api/auth/set_session.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: res.data.token, user: res.data.user })
        });

        Ui.toast({ type: 'success', title: 'Success', message: 'Login successful' });
        window.location.href = 'dashboard.php';
      } catch (err) {
        Ui.toast({ type: 'error', title: 'Login failed', message: err.message || 'Login failed' });
      } finally {
        Ui.hideLoading();
      }
    });
  }

  async function initRegisterPage() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const setError = (id, msg) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg || '';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      setError('nameError', '');
      setError('emailError', '');
      setError('passwordError', '');
      setError('phoneError', '');

      const payload = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value.trim() || undefined,
        role: document.getElementById('role').value || undefined
      };

      if (!payload.name) return setError('nameError', 'Name is required');
      if (!payload.email) return setError('emailError', 'Email is required');
      if (!payload.password) return setError('passwordError', 'Password is required');

      try {
        Ui.showLoading();
        const res = await Api.register(payload);
        localStorage.setItem('token', res.data.token);

        // Also set PHP session
        const lastSlashIndex = window.location.pathname.lastIndexOf('/');
        const folderPath = window.location.pathname.substring(0, lastSlashIndex);
        
        await fetch((folderPath === '/' ? '' : folderPath) + '/api/auth/set_session.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: res.data.token, user: res.data.user })
        });

        Ui.toast({ type: 'success', title: 'Success', message: 'Account created' });
        window.location.href = 'dashboard.php';
      } catch (err) {
        Ui.toast({ type: 'error', title: 'Register failed', message: err.message || 'Register failed' });
      } finally {
        Ui.hideLoading();
      }
    });
  }

  function initAuthGuards() {
    // Protected pages
    const protectedPaths = ['dashboard.php', 'products.php', 'sales.php', 'customers.php', 'reports.php'];
    const current = window.location.pathname;

    if (protectedPaths.some(p => current.endsWith(p))) {
      if (!requireAuthRedirect()) return;
    }
  }

  function init() {
    Ui.bindCommonSidebarAndTheme();
    Ui.bindLogout();
    updateHeaderUser();
    initAuthGuards();
    initLoginPage();
    initRegisterPage();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
