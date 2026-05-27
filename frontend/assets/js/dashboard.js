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
            label: 'Revenue',
            data: revenue,
            borderColor: '#4361ee',
            backgroundColor: 'rgba(67,97,238,0.15)',
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => fmtMoney(v) } }
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

  async function loadDashboard() {
    try {
      Ui.showLoading();

      const [statsRes, chartsRes, recentRes] = await Promise.all([
        Api.dashboardStats(),
        Api.dashboardCharts('days=30'),
        Api.listRecentSales('limit=7')
      ]);

      const stats = statsRes.data;
      document.getElementById('statTotalProducts').textContent = stats.overview.totalProducts;
      document.getElementById('statTotalSales').textContent = stats.overview.totalSales;
      document.getElementById('statTotalRevenue').textContent = stats.overview.totalRevenue;
      document.getElementById('statInventoryValue').textContent = fmtMoney(stats.overview.inventoryValue);

      document.getElementById('alertLowStock').textContent = stats.alerts.lowStock;
      document.getElementById('alertOutOfStock').textContent = stats.alerts.outOfStock;

      // Charts: daily sales revenue
      renderDailySalesChart(chartsRes.data.dailySales);

      // Recent sales table
      renderRecentSalesTable(recentRes.data.sales);
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

