/*
  SMART SHOP MANAGEMENT SYSTEM
  Sales page logic (create sale, update totals, save, show receipt)
*/

(function () {
  let products = [];
  let items = [];

  const els = {
    customerSelect: () => document.getElementById('customerSelect'),
    paymentMethod: () => document.getElementById('paymentMethod'),
    discountPercent: () => document.getElementById('discountPercent'),
    taxRate: () => document.getElementById('taxRate'),
    amountPaid: () => document.getElementById('amountPaid'),
    notes: () => document.getElementById('notes'),
    productSelect: () => document.getElementById('productSelect'),
    productQty: () => document.getElementById('productQty'),
    saleItemsTbody: () => document.querySelector('#saleItemsTable tbody'),
    totalSubtotal: () => document.getElementById('totalSubtotal'),
    totalDiscount: () => document.getElementById('totalDiscount'),
    totalTax: () => document.getElementById('totalTax'),
    totalGrand: () => document.getElementById('totalGrand'),
    saleInfo: () => document.getElementById('saleInfo'),
    receiptOverlay: () => document.getElementById('receiptOverlay'),
    receiptContent: () => document.getElementById('receiptContent')
  };

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    try { return new Date(d).toLocaleString(); } catch { return String(d); }
  }

  function calcTotals() {
    const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
    const discountPercent = Number(els.discountPercent().value || 0);
    const discount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discount;
    const taxRate = Number(els.taxRate().value || 0);
    const tax = (afterDiscount * taxRate) / 100;
    const total = afterDiscount + tax;
    const amountPaid = Number(els.amountPaid().value || 0);
    const change = amountPaid - total;

    els.totalSubtotal().textContent = fmtMoney(subtotal);
    els.totalDiscount().textContent = fmtMoney(discount);
    els.totalTax().textContent = fmtMoney(tax);
    els.totalGrand().textContent = fmtMoney(total);

    // Update info text
    if (els.saleInfo()) {
      els.saleInfo().textContent = `Total: ${fmtMoney(total)} • Change: ${fmtMoney(change)}`;
    }

    return { subtotal, discount, tax, total, change };
  }

  function renderSaleItems() {
    const tbody = els.saleItemsTbody();
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const it of items) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${it.name}</td>
        <td>${it.quantity}</td>
        <td>${fmtMoney(it.price)}</td>
        <td>${fmtMoney(it.subtotal)}</td>
        <td>
          <button class="btn btn-sm btn-danger" type="button" data-remove="${it.productId}">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove');
        items = items.filter(x => x.productId !== id);
        renderSaleItems();
        calcTotals();
      });
    });
  }

  function getSelectedProductId() {
    return els.productSelect().value;
  }

  function loadProductsForSaleSelect() {
    // We load minimal product list to populate selection
    return Api.listProducts(buildQuery({ limit: 100, page: 1, stockStatus: '', search: '' }))
      .then(res => {
        products = res.data.products || [];
        const select = els.productSelect();
        select.innerHTML = '';

        const inStockProducts = products.filter(p => p.stockStatus !== 'out_of_stock');
        inStockProducts.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p._id;
          opt.textContent = `${p.name} (Qty: ${p.quantity})`;
          select.appendChild(opt);
        });
      });
  }

  function buildQuery(obj) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v === '' || v === undefined || v === null) continue;
      params.set(k, v);
    }
    return params.toString();
  }

  async function loadCustomersForDropdown() {
    try {
      const res = await Api.customersListAll('');
      const list = res.data.customers || [];

      const select = els.customerSelect();
      select.innerHTML = '<option value="">Walk-in Customer</option>';
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c._id;
        opt.textContent = `${c.name} (${c.phone || 'no phone'})`;
        select.appendChild(opt);
      });
    } catch {
      // If it fails, keep Walk-in option
    }
  }

  async function addItemToCart() {
    const productId = getSelectedProductId();
    if (!productId) return;

    const qty = Number(els.productQty().value || 0);
    if (qty < 1) {
      Ui.toast({ type: 'warning', title: 'Invalid quantity', message: 'Quantity must be at least 1' });
      return;
    }

    const product = products.find(p => p._id === productId);
    if (!product) return;

    if (product.quantity < qty) {
      Ui.toast({ type: 'error', title: 'Insufficient stock', message: `Available: ${product.quantity}` });
      return;
    }

    const price = Number(product.sellingPrice || 0);
    const subtotal = price * qty;

    // Replace existing item (same product) for simplicity
    const existing = items.find(i => i.productId === productId);
    if (existing) {
      existing.quantity = qty;
      existing.price = price;
      existing.subtotal = subtotal;
    } else {
      items.push({ productId, name: product.name, quantity: qty, price, subtotal });
    }

    renderSaleItems();
    calcTotals();
  }

  function openReceiptModal(receipt) {
    const overlay = els.receiptOverlay();
    const content = els.receiptContent();
    if (!overlay || !content) return;

    const r = receipt?.receipt;
    if (!r) {
      content.textContent = 'No receipt data.';
      overlay.classList.add('active');
      return;
    }

    const html = `
      <div class="card" style="box-shadow:none; border:1px solid var(--gray-200);">
        <div class="card-header" style="border-bottom:1px solid var(--gray-200);">
          <div>
            <div style="font-weight:700; font-size:1.1rem;">Receipt</div>
            <div class="text-muted" style="font-size: var(--font-size-xs);">${escapeHtml(r.invoiceNumber)}</div>
          </div>
          <div class="text-right">
            <div class="text-muted" style="font-size: var(--font-size-xs);">${fmtDate(r.date)}</div>
          </div>
        </div>

        <div class="card-body" style="padding: var(--spacing-lg);">
          <div style="display:flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div class="text-muted" style="font-size: var(--font-size-xs);">Customer</div>
              <div style="font-weight:600;">${escapeHtml(r.customerName || (r.customer?.name || 'Walk-in Customer'))}</div>
            </div>
            <div>
              <div class="text-muted" style="font-size: var(--font-size-xs);">Staff</div>
              <div style="font-weight:600;">${escapeHtml(r.staffName || '')}</div>
            </div>
            <div>
              <div class="text-muted" style="font-size: var(--font-size-xs);">Payment</div>
              <div style="font-weight:600;">${escapeHtml(r.paymentMethod)} (${escapeHtml(r.paymentStatus)})</div>
            </div>
          </div>

          <div class="table-container" style="margin-top: var(--spacing-lg);">
            <table class="table">
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
              <tbody>
                ${(r.items || []).map(it => `
                  <tr>
                    <td>${escapeHtml(it.productName)}</td>
                    <td>${it.quantity}</td>
                    <td>${fmtMoney(it.price)}</td>
                    <td>${fmtMoney(it.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top: var(--spacing-lg); display:flex; justify-content: flex-end;">
            <div style="min-width: 260px;">
              <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Subtotal</span><strong>${fmtMoney(r.subtotal)}</strong></div>
              <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Discount</span><strong>${fmtMoney(r.discount)}</strong></div>
              <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Tax</span><strong>${fmtMoney(r.tax)}</strong></div>
              <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Total</span><strong>${fmtMoney(r.total)}</strong></div>
              <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Paid</span><strong>${fmtMoney(r.amountPaid)}</strong></div>
              <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Change</span><strong>${fmtMoney(r.change)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;

    content.innerHTML = html;
    overlay.classList.add('active');
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  async function loadRecentSales() {
    const tbody = document.querySelector('#recentSalesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
      Ui.showLoading();
      const res = await Api.listRecentSales('limit=10');
      const list = res.data.sales || [];

      for (const sale of list) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(sale.invoiceNumber || '')}</td>
          <td>${escapeHtml(sale.customer?.name || '')}</td>
          <td>${escapeHtml(sale.paymentMethod || '')}</td>
          <td>${fmtMoney(sale.total)}</td>
          <td>${fmtDate(sale.saleDate)}</td>
        `;
        tbody.appendChild(tr);
      }

      // Optionally click to view receipt
      tbody.querySelectorAll('tr').forEach((tr, idx) => {
        const sale = list[idx];
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', async () => {
          try {
            Ui.showLoading();
            const receipt = await Api.saleReceipt(sale._id);
            openReceiptModal(receipt);
          } catch (err) {
            Ui.toast({ type: 'error', title: 'Receipt error', message: err.message || 'Failed to load receipt' });
          } finally {
            Ui.hideLoading();
          }
        });
      });
    } catch (err) {
      Ui.toast({ type: 'error', title: 'Load sales failed', message: err.message || '' });
    } finally {
      Ui.hideLoading();
    }
  }

  async function completeSale() {
    if (items.length === 0) {
      Ui.toast({ type: 'warning', title: 'Empty sale', message: 'Add at least one product' });
      return;
    }

    const payload = {
      items: items.map(it => ({ product: it.productId, quantity: it.quantity })),
      customer: els.customerSelect().value || undefined,
      customerName: 'Walk-in Customer',
      paymentMethod: els.paymentMethod().value,
      amountPaid: Number(els.amountPaid().value || 0),
      discountPercent: Number(els.discountPercent().value || 0),
      taxRate: Number(els.taxRate().value || 0),
      notes: els.notes().value || ''
    };

    try {
      Ui.showLoading();
      const res = await Api.createSale(payload);
      Ui.toast({ type: 'success', title: 'Sale saved', message: 'Transaction completed' });

      // receipt
      const createdId = res.data.sale?._id;
      if (createdId) {
        const receipt = await Api.saleReceipt(createdId);
        openReceiptModal(receipt);
      }

      // Reset cart
      items = [];
      renderSaleItems();
      calcTotals();

      // Reload recent sales list
      await loadRecentSales();
    } catch (err) {
      Ui.toast({ type: 'error', title: 'Sale failed', message: err.message || 'Failed to create sale' });
    } finally {
      Ui.hideLoading();
    }
  }

  function bindEvents() {
    document.getElementById('btnAddItem').addEventListener('click', addItemToCart);

    document.getElementById('btnCompleteSale').addEventListener('click', completeSale);

    const receiptClose = document.getElementById('receiptClose');
    const btnCloseReceipt = document.getElementById('btnCloseReceipt');
    if (receiptClose) receiptClose.addEventListener('click', () => els.receiptOverlay().classList.remove('active'));
    if (btnCloseReceipt) btnCloseReceipt.addEventListener('click', () => els.receiptOverlay().classList.remove('active'));

    const printBtn = document.getElementById('btnPrint');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    ['discountPercent', 'taxRate', 'amountPaid'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => calcTotals());
    });
  }

  window.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    calcTotals();

    try {
      Ui.showLoading();
      await loadProductsForSaleSelect();
      await loadCustomersForDropdown();
      await loadRecentSales();
    } catch (err) {
      Ui.toast({ type: 'error', title: 'Init error', message: err.message || 'Failed to init sales page' });
    } finally {
      Ui.hideLoading();
    }
  });
})();

