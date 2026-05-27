/*
  SMART SHOP MANAGEMENT SYSTEM
  Products management page logic
*/

(function () {
  let currentPage = 1;
  let currentLimit = 10;
  let currentQuery = { page: 1, limit: 10 };
  let categories = [];
  let formMode = 'create';
  let editingId = null;

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function toastError(err, fallback) {
    Ui.toast({ type: 'error', title: 'Error', message: err?.message || fallback });
  }

  function fmtDate(d) {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return '';
    }
  }

  const currencyFormatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function fmtMoney(n) {
    return currencyFormatter.format(Number(n || 0));
  }

  function buildQueryString(queryObj) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(queryObj)) {
      if (v === '' || v === undefined || v === null) continue;
      params.set(k, v);
    }
    return params.toString();
  }

  async function loadCategories() {
    const res = await Api.productCategories();
    categories = res.data.categories || [];

    const select = document.getElementById('pCategory');
    if (!select) return;

    select.innerHTML = '';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });

    // Also fill filters
    const filter = document.getElementById('categoryFilter');
    if (filter) {
      filter.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        filter.appendChild(opt);
      });
    }
    renderCategoryChips();
  }

  function renderCategoryChips() {
    const chipsContainer = document.getElementById('categoryChips');
    if (!chipsContainer) return;
    chipsContainer.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'category-chip active';
    allChip.textContent = 'All Categories';
    allChip.dataset.category = '';
    chipsContainer.appendChild(allChip);

    [...categories].sort().forEach(category => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'category-chip';
      chip.textContent = category;
      chip.dataset.category = category;
      chipsContainer.appendChild(chip);
    });

    chipsContainer.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        chipsContainer.querySelectorAll('.category-chip').forEach(item => item.classList.remove('active'));
        chip.classList.add('active');
        document.getElementById('categoryFilter').value = chip.dataset.category;
        currentQuery.category = chip.dataset.category;
        currentPage = 1;
        currentQuery.page = 1;
        await loadProducts();
      });
    });
  }

  function openModal(mode, product = null) {
    const overlay = document.getElementById('productModalOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    formMode = mode;
    editingId = product?._id || null;

    document.getElementById('productModalTitle').textContent = mode === 'create' ? 'Add Product' : 'Edit Product';

    if (mode === 'edit' && product) {
      document.getElementById('pName').value = product.name || '';
      document.getElementById('pCategory').value = product.category || '';
      document.getElementById('pDescription').value = product.description || '';
      document.getElementById('pBarcode').value = product.barcode || '';
      document.getElementById('pQuantity').value = product.quantity ?? 0;
      document.getElementById('pMinStock').value = product.minStock ?? 10;
      document.getElementById('pBuyingPrice').value = product.buyingPrice ?? 0;
      document.getElementById('pSellingPrice').value = product.sellingPrice ?? 0;
      document.getElementById('pStatus').value = product.status || 'active';
    } else {
      formMode = 'create';
      editingId = null;
      document.getElementById('productForm').reset();
      document.getElementById('pMinStock').value = 10;
      document.getElementById('pQuantity').value = 0;
      document.getElementById('pBuyingPrice').value = 0;
      document.getElementById('pSellingPrice').value = 0;
      document.getElementById('pStatus').value = 'active';
    }
  }

  function closeModal() {
    const overlay = document.getElementById('productModalOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function setFormErrors(errorsMap) {
    // errorsMap: { fieldId: message }
    Object.entries(errorsMap || {}).forEach(([id, msg]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = msg;
    });
  }

  function collectProductForm() {
    return {
      name: document.getElementById('pName').value.trim(),
      description: document.getElementById('pDescription').value.trim() || undefined,
      category: document.getElementById('pCategory').value,
      barcode: document.getElementById('pBarcode').value.trim() || undefined,
      quantity: Number(document.getElementById('pQuantity').value),
      minStock: Number(document.getElementById('pMinStock').value),
      buyingPrice: Number(document.getElementById('pBuyingPrice').value),
      sellingPrice: Number(document.getElementById('pSellingPrice').value),
      status: document.getElementById('pStatus').value
    };
  }

  function renderProductRows(products) {
    const tbody = document.querySelector('#productsTable tbody');
    const empty = document.getElementById('productsEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';
    const list = products || [];

    if (list.length === 0) {
      if (empty) empty.classList.remove('d-none');
      return;
    }
    if (empty) empty.classList.add('d-none');

    for (const p of list) {
      const tr = document.createElement('tr');

      let imgSrc = '';
      if (p.image) {
        imgSrc = p.image;
        if (imgSrc.startsWith('/assets-img/')) imgSrc = imgSrc.replace('/assets-img/', '');
        else if (imgSrc.startsWith('/')) imgSrc = imgSrc.substring(1);
      }
      const imgHtml = imgSrc
        ? `<div class="product-image-wrap" data-id="${p._id}"><img class="product-image" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<span style=font-size:1.6rem>&#128230;</span>'"/></div>`
        : `<div class="product-image-wrap" style="display:flex;align-items:center;justify-content:center;font-size:1.6rem;">&#128230;</div>`;

      tr.innerHTML = `
        <td>${imgHtml}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td>${escapeHtml(p.barcode || '-')}</td>
        <td>${p.quantity}</td>
        <td>${fmtMoney(p.buyingPrice)}</td>
        <td>${fmtMoney(p.sellingPrice)}</td>
        <td>
          ${p.stockStatus === 'in_stock' ? '<span class="badge badge-success">In stock</span>' : ''}
          ${p.stockStatus === 'low_stock' ? '<span class="badge badge-warning">Low</span>' : ''}
          ${p.stockStatus === 'out_of_stock' ? '<span class="badge badge-danger">Out</span>' : ''}
        </td>
        <td>${fmtDate(p.dateAdded || p.createdAt)}</td>
        <td>
          <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-sm btn-outline" data-action="edit" data-id="${p._id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p._id}">Delete</button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);

        // Add interactive 3D tilt handlers for the image
        const wrap = tr.querySelector('.product-image-wrap');
        if (wrap) {
          const img = wrap.querySelector('.product-image');
          function handleMove(e) {
            const rect = wrap.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            const rotY = x * 12; // degrees
            const rotX = -y * 12;
            img.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(18px) scale(1.03)`;
          }
          function handleLeave() {
            img.style.transform = '';
          }
          wrap.addEventListener('mousemove', handleMove);
          wrap.addEventListener('mouseleave', handleLeave);
          wrap.addEventListener('mouseenter', () => img.classList.add('glow'));
          wrap.addEventListener('mouseleave', () => img.classList.remove('glow'));
        }
    }

    tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prod = list.find(x => x._id === id);
        openModal('edit', prod);
      });
    });

    tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Delete this product?')) return;
        try {
          Ui.showLoading();
          await Api.deleteProduct(id);
          Ui.toast({ type: 'success', title: 'Deleted', message: 'Product deleted' });
          await loadProducts();
        } catch (err) {
          toastError(err, 'Delete failed');
        } finally {
          Ui.hideLoading();
        }
      });
    });
  }

  function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;
    container.innerHTML = '';

    const { page, pages } = pagination || { page: 1, pages: 1 };
    const current = page;

    const addBtn = (label, p, disabled = false) => {
      const btn = document.createElement('button');
      btn.className = `pagination-btn ${p === current ? 'active' : ''}`;
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled) {
        btn.addEventListener('click', () => {
          currentPage = p;
          currentQuery.page = p;
          loadProducts();
        });
      }
      container.appendChild(btn);
    };

    addBtn('«', 1, current === 1);
    addBtn(String(Math.max(1, current - 1)), Math.max(1, current - 1), current <= 1);
    addBtn(String(current), current, true);
    addBtn(String(Math.min(pages, current + 1)), Math.min(pages, current + 1), current >= pages);
    addBtn('»', pages, current >= pages);
  }

  async function loadProducts() {
    try {
      Ui.showLoading();
      const qs = buildQueryString(currentQuery);
      const res = await Api.listProducts(qs);
      const payload = res.data;

      document.getElementById('stockCounts').textContent = `In: ${payload.stockCounts.in_stock} • Low: ${payload.stockCounts.low_stock} • Out: ${payload.stockCounts.out_of_stock}`;

      renderProductRows(payload.products);
      renderPagination(payload.pagination);
    } catch (err) {
      toastError(err, 'Failed to load products');
    } finally {
      Ui.hideLoading();
    }
  }

  function bindEvents() {
    const overlay = document.getElementById('productModalOverlay');
    const closeBtn = document.getElementById('productModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const cancelBtn = document.getElementById('productFormCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    document.getElementById('btnAddProduct').addEventListener('click', () => {
      openModal('create');
    });

    document.getElementById('productForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = collectProductForm();

      try {
        Ui.showLoading();
        if (formMode === 'create') {
          await Api.createProduct(payload);
          Ui.toast({ type: 'success', title: 'Saved', message: 'Product added' });
        } else {
          await Api.updateProduct(editingId, payload);
          Ui.toast({ type: 'success', title: 'Saved', message: 'Product updated' });
        }

        closeModal();
        await loadProducts();
      } catch (err) {
        toastError(err, 'Save failed');
      } finally {
        Ui.hideLoading();
      }
    });

    document.getElementById('btnApplyFilters').addEventListener('click', async () => {
      currentPage = 1;
      currentQuery.page = 1;

      currentQuery.search = document.getElementById('searchInput').value.trim();
      currentQuery.category = document.getElementById('categoryFilter').value;
      currentQuery.stockStatus = document.getElementById('stockStatusFilter').value;
      currentQuery.limit = currentLimit;

      await loadProducts();
    });

    document.getElementById('btnResetFilters').addEventListener('click', async () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('categoryFilter').value = '';
      document.getElementById('stockStatusFilter').value = '';

      const chipsContainer = document.getElementById('categoryChips');
      if (chipsContainer) {
        chipsContainer.querySelectorAll('.category-chip').forEach(item => item.classList.remove('active'));
        const firstChip = chipsContainer.querySelector('.category-chip');
        if (firstChip) firstChip.classList.add('active');
      }

      currentQuery = { page: 1, limit: currentLimit };
      currentPage = 1;

      await loadProducts();
    });
  }

  window.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadCategories();
      bindEvents();
      await loadProducts();
    } catch (err) {
      toastError(err, 'Init failed');
    }
  });
})();
