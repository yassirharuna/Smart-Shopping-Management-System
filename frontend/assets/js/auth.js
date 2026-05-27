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
      window.location.href = '/login';
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

    // Only role is encoded in current backend generateAuthToken.
    // Username is fetched in future improvement, but keep it simple for assessment.
    const role = decodeRoleFromToken();
    roleEl.textContent = role ? String(role) : '—';

    // Best-effort: show first part of token email/id if name isn't available
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
        Ui.toast({ type: 'success', title: 'Success', message: 'Login successful' });

        window.location.href = '/dashboard';
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
        Ui.toast({ type: 'success', title: 'Success', message: 'Account created' });
        window.location.href = '/dashboard';
      } catch (err) {
        Ui.toast({ type: 'error', title: 'Register failed', message: err.message || 'Register failed' });
      } finally {
        Ui.hideLoading();
      }
    });
  }

  function initAuthGuards() {
    // Protected pages: dashboard/products/sales/customers/reports
    const protectedPaths = ['/dashboard', '/products', '/sales', '/customers', '/reports'];
    const current = window.location.pathname;

    if (protectedPaths.some(p => current.startsWith(p))) {
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

