/*
  SMART SHOP MANAGEMENT SYSTEM
  Customers page logic (CRUD + purchase history)
*/

(function () {
  let currentPage = 1;
  let limit = 10;

  let customersCache = [];
  let mode = 'create';
  let editingId = null;

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
  }

  function buildQuery(obj) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v === '' || v === undefined || v === null) continue;
      p.set(k, v);
    }
    return p.toString();
  }

  function openCustomerModal(modeToOpen, customer = null) {
    const overlay = document.getElementById('customerModalOverlay');
    overlay.classList.add('active');

    mode = modeToOpen;
    editingId = customer?._id || null;
    document.getElementById('customerModalTitle').textContent = mode === 'create' ? 'Add Customer' : 'Edit Customer';

    if (mode === 'edit' && customer) {
      document.getElementById('cName').value = customer.name || '';
      document.getElementById('cEmail').value = customer.email || '';
      document.getElementById('cPhone').value = customer.phone || '';
      document.getElementById('cCity').value = customer.address?.city || '';
      document.getElementById('cCountry').value = customer.address?.country || '';
      document.getElementById('cNotes').value = customer.notes || '';
      document.getElementById('cActive').value = String(customer.isActive ?? true);
    } else {
      overlay.querySelector('form').reset();
      document.getElementById('cActive').value = 'true';
    }
  }

  function closeCustomerModal() {
    document.getElementById('customerModalOverlay').classList.remove('active');
  }

  function openCustomerDetailsModal(customer, purchases) {
    const header = document.getElementById('customerDetailsHeader');
    const overlay = document.getElementById('customerDetailsOverlay');
    overlay.classList.add('active');

    header.innerHTML = `
      <div class="card" style="box-shadow:none; border:1px solid var(--gray-200);">
        <div class="card-body" style="padding: var(--spacing-lg);">
          <div style="display:flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div class="text-muted" style="font-size: var(--font-size-xs);">Customer</div>
              <div style="font-weight:700; font-size:1.1rem;">${escapeHtml(customer.name)}</div>
              <div class="text-muted" style="font-size: var(--font-size-xs); margin-top: 0.25rem;">${escapeHtml(customer.email || '—')} • ${escapeHtml(customer.phone || '—')}</div>
            </div>
            <div>
              <div class="text-muted" style="font-size: var(--font-size-xs);">Tier & Loyalty</div>
              <div style="font-weight:700;">${escapeHtml(customer.membershipTier || '')}</div>
              <div class="text-muted" style="font-size: var(--font-size-xs); margin-top: 0.25rem;">Points: ${customer.loyaltyPoints || 0}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const tbody = document.querySelector('#customerPurchasesTable tbody');
    tbody.innerHTML = '';

    (purchases || []).forEach(sale => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(sale.invoiceNumber || '')}</td>
        <td>${fmtDate(sale.saleDate)}</td>
        <td>${escapeHtml(sale.staff?.name || '')}</td>
        <td>${fmtMoney(sale.total)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function loadCustomers() {
    const search = document.getElementById('searchInput').value.trim();
    const membershipTier = document.getElementById('tierFilter').value;
    const isActive = document.getElementById('activeFilter').value;

    const query = {
      page: currentPage,
      limit,
      search,
      membershipTier,
      isActive
    };

    try {
      Ui.showLoading();
      const res = await Api.listCustomers(buildQuery(query));
      const payload = res.data;
      customersCache = payload.customers || [];

      const tbody = document.querySelector('#customersTable tbody');
      const empty = document.getElementById('customersEmpty');
      tbody.innerHTML = '';

      if (customersCache.length === 0) {
        if (empty) empty.classList.remove('d-none');
        return;
      }
      if (empty) empty.classList.add('d-none');

      customersCache.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.email || '')}</td>
          <td>${escapeHtml(c.phone || '')}</td>
          <td>${escapeHtml(c.membershipTier || '')}</td>
          <td>${fmtMoney(c.totalSpent)}</td>
          <td>${c.loyaltyPoints || 0}</td>
          <td>${c.isActive ? 'Active' : 'Inactive'}</td>
          <td>
            <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-sm btn-outline" data-action="details" data-id="${c._id}">Details</button>
              <button class="btn btn-sm btn-outline" data-action="edit" data-id="${c._id}">Edit</button>
              <button class="btn btn-sm btn-danger" data-action="delete" data-id="${c._id}">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('button[data-action="details"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          try {
            Ui.showLoading();
            const res = await Api.customerDetails(id);
            openCustomerDetailsModal(res.data.customer, res.data.purchases);
          } catch (err) {
            Ui.toast({ type: 'error', title: 'Error', message: err.message || 'Failed to load details' });
          } finally {
            Ui.hideLoading();
          }
        });
      });

      tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const customer = customersCache.find(x => x._id === id);
          if (customer) openCustomerModal('edit', customer);
        });
      });

      tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!confirm('Delete this customer?')) return;
          try {
            Ui.showLoading();
            await Api.deleteCustomer(id);
            Ui.toast({ type: 'success', title: 'Deleted', message: 'Customer deleted' });
            await loadCustomers();
          } catch (err) {
            Ui.toast({ type: 'error', title: 'Delete failed', message: err.message || '' });
          } finally {
            Ui.hideLoading();
          }
        });
      });

      // Pagination
      renderPagination(payload.pagination);

    } catch (err) {
      Ui.toast({ type: 'error', title: 'Load failed', message: err.message || '' });
    } finally {
      Ui.hideLoading();
    }
  }

  function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;
    container.innerHTML = '';

    const { page, pages } = pagination || { page: 1, pages: 1 };
    const curr = page;

    const add = (label, p, disabled = false) => {
      const btn = document.createElement('button');
      btn.className = `pagination-btn ${p === curr ? 'active' : ''}`;
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled) {
        btn.addEventListener('click', () => {
          currentPage = p;
          loadCustomers();
        });
      }
      container.appendChild(btn);
    };

    add('«', 1, curr === 1);
    add(String(Math.max(1, curr - 1)), Math.max(1, curr - 1), curr <= 1);
    add(String(curr), curr, true);
    add(String(Math.min(pages, curr + 1)), Math.min(pages, curr + 1), curr >= pages);
    add('»', pages, curr >= pages);
  }

  function bindEvents() {
    document.getElementById('btnAddCustomer').addEventListener('click', () => openCustomerModal('create'));

    document.getElementById('customerModalClose').addEventListener('click', closeCustomerModal);
    document.getElementById('customerFormCancel').addEventListener('click', closeCustomerModal);

    document.getElementById('customerModalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeCustomerModal();
    });

    // Details modal close
    document.getElementById('customerDetailsClose').addEventListener('click', () => {
      document.getElementById('customerDetailsOverlay').classList.remove('active');
    });
    document.getElementById('btnCloseCustomerDetails').addEventListener('click', () => {
      document.getElementById('customerDetailsOverlay').classList.remove('active');
    });

    document.getElementById('customerForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        name: document.getElementById('cName').value.trim(),
        email: document.getElementById('cEmail').value.trim() || undefined,
        phone: document.getElementById('cPhone').value.trim(),
        notes: document.getElementById('cNotes').value.trim() || undefined,
        isActive: document.getElementById('cActive').value === 'true',
        address: {
          city: document.getElementById('cCity').value.trim() || undefined,
          country: document.getElementById('cCountry').value.trim() || undefined
        }
      };

      try {
        Ui.showLoading();
        if (mode === 'create') {
          await Api.createCustomer(payload);
          Ui.toast({ type: 'success', title: 'Saved', message: 'Customer created' });
        } else {
          await Api.updateCustomer(editingId, payload);
          Ui.toast({ type: 'success', title: 'Saved', message: 'Customer updated' });
        }
        closeCustomerModal();
        await loadCustomers();
      } catch (err) {
        Ui.toast({ type: 'error', title: 'Save failed', message: err.message || '' });
      } finally {
        Ui.hideLoading();
      }
    });

    document.getElementById('btnApplyFilters').addEventListener('click', () => {
      currentPage = 1;
      loadCustomers();
    });

    document.getElementById('btnResetFilters').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('tierFilter').value = '';
      document.getElementById('activeFilter').value = '';
      currentPage = 1;
      loadCustomers();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadCustomers();
  });
})();

