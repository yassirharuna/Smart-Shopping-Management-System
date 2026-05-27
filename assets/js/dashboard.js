/*
  SMART SHOP MANAGEMENT SYSTEM
  Dashboard logic (cards, alerts, charts, recent sales)
*/

(function () {
  function fmtMoney(n) {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return String(d);
    }
  }

  let charts = {};

  function destroyCharts() {
    Object.values(charts).forEach(c => c && c.destroy && c.destroy());
    charts = {};
  }

  function renderDailySalesChart(series) {
    const canvas = document.getElementById('chartDailySales');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = [];
    const revenue = [];
    const salesCount = [];

    for (const row of series || []) {
      // row._id has year/month/day
      const id = row._id || {};
      const label = `${id.month}/${id.day}`;
      labels.push(label);
      salesCount.push(row.totalSales || 0);
      revenue.push(row.totalRevenue || 0);
    }

    destroyCharts();

    charts.dailySales = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue (KES)',
            data: revenue,
            borderColor: '#059669',
            backgroundColor: 'rgba(5,150,105,0.12)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#059669',
            pointRadius: 4,
            borderWidth: 2.5
          },
          {
            label: 'No. of Sales',
            data: salesCount,
            borderColor: '#0891b2',
            backgroundColor: 'rgba(8,145,178,0.06)',
            tension: 0.4,
            fill: false,
            pointBackgroundColor: '#0891b2',
            pointRadius: 3,
            borderDash: [5,3],
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, color: '#374151' } },
          tooltip: { callbacks: { label: ctx => ctx.datasetIndex === 0
            ? ` KES ${Number(ctx.raw).toLocaleString()}`
            : ` ${ctx.raw} sales` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => 'KES ' + Number(v).toLocaleString(), color: '#059669' }, grid: { color: 'rgba(16,185,129,0.08)' } },
          x: { ticks: { color: '#374151' }, grid: { color: 'rgba(0,0,0,0.04)' } }
        }
      }
    });
  }

  function renderRecentSalesTable(sales) {
    const tbody = document.querySelector('#recentSalesTable tbody');
    const empty = document.getElementById('recentSalesEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';
    const list = sales || [];

    if (list.length === 0) {
      if (empty) empty.classList.remove('d-none');
      return;
    }

    if (empty) empty.classList.add('d-none');

    for (const sale of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sale.invoiceNumber || ''}</td>
        <td>${sale.customer?.name || sale.customerName || '—'}</td>
        <td>${fmtMoney(sale.total)}</td>
        <td>${fmtDate(sale.saleDate)}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function renderFeaturedProducts(products) {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    container.innerHTML = '';
    const list = (products || []).slice(0, 8);
    if (!list.length) {
      container.innerHTML = '<p class="text-muted" style="font-size:var(--font-size-sm);">No products available.</p>';
      return;
    }
    const fmt = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });
    for (const p of list) {
      let img = p.image || '';
      if (img.startsWith('/assets-img/')) img = img.replace('/assets-img/', '');
      else if (img.startsWith('/')) img = img.substring(1);
      const card = document.createElement('a');
      card.href = 'products.php';
      card.className = 'product-card';
      const imgTag = img
        ? `<img class="product-card-img" src="${img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex')" /><div class="product-card-img" style="display:none;align-items:center;justify-content:center;font-size:2rem;">&#128230;</div>`
        : `<div class="product-card-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">&#128230;</div>`;
      card.innerHTML = imgTag + `<div class="product-card-body"><div class="product-card-name">${p.name}</div><div class="product-card-price">${fmt.format(p.sellingPrice)}</div></div>`;
      container.appendChild(card);
    }
  }

  async function loadDashboard() {
    try {
      Ui.showLoading();

      const [statsRes, chartsRes, recentRes, productsRes] = await Promise.all([
        Api.dashboardStats(),
        Api.dashboardCharts('days=30'),
        Api.listRecentSales('limit=7'),
        Api.listProducts('limit=8&page=1')
      ]);

      const stats = statsRes.data;
      document.getElementById('statTotalProducts').textContent = stats.overview.totalProducts;
      document.getElementById('statTotalSales').textContent = stats.overview.totalSales;
      document.getElementById('statTotalRevenue').textContent = stats.overview.totalRevenue;
      document.getElementById('statInventoryValue').textContent = fmtMoney(stats.overview.inventoryValue);

      document.getElementById('alertLowStock').textContent = stats.alerts.lowStock;
      document.getElementById('alertOutOfStock').textContent = stats.alerts.outOfStock;

      renderDailySalesChart(chartsRes.data.dailySales);
      renderRecentSalesTable(recentRes.data.sales);
      renderFeaturedProducts(productsRes?.data?.products || []);
    } catch (err) {
      Ui.toast({ type: 'error', title: 'Dashboard error', message: err.message || 'Failed to load dashboard' });
    } finally {
      Ui.hideLoading();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
  });
})();

