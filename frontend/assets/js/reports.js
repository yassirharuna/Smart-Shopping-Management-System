/*
  SMART SHOP MANAGEMENT SYSTEM
  Reports page logic (charts via Chart.js CDN)
*/

(function () {
  let charts = [];

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function destroyCharts() {
    charts.forEach(c => c && c.destroy && c.destroy());
    charts = [];
  }

  async function loadReports() {
    const daysEl = document.getElementById('days');
    const days = Number(daysEl?.value || 30);

    try {
      Ui.showLoading();
      destroyCharts();

      // Sale stats (range) - backend uses startDate/endDate query
      // For simplicity, we call /dashboard/charts as well (it contains daily sales data).
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);

      const saleStatsRes = await Api.saleStatistics(`?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);

      // We also load dashboard charts for daily sales trend
      const dashChartsRes = await Api.dashboardCharts(`days=${days}`);

      const byPayment = saleStatsRes.data.byPaymentMethod || [];

      const daily = dashChartsRes.data.dailySales || [];
      const labels = daily.map(row => {
        const id = row._id || {};
        return `${id.month}/${id.day}`;
      });
      const revenue = daily.map(row => row.totalRevenue || 0);

      const salesCanvas = document.getElementById('chartReportsSales');
      const paymentCanvas = document.getElementById('chartPayment');

      if (salesCanvas && typeof Chart !== 'undefined') {
        const c1 = new Chart(salesCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Revenue',
              data: revenue,
              backgroundColor: 'rgba(67,97,238,0.5)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtMoney(v) } } }
          }
        });
        charts.push(c1);
      }

      if (paymentCanvas && typeof Chart !== 'undefined') {
        const labels2 = byPayment.map(x => x._id || '');
        const totals2 = byPayment.map(x => x.total || 0);

        const c2 = new Chart(paymentCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: labels2,
            datasets: [{
              data: totals2,
              backgroundColor: ['#4361ee', '#2ecc71', '#f39c12', '#e74c3c', '#3498db', '#95a5a6']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
        charts.push(c2);
      }

      // Top products: backend dashboard charts provides topProducts; reuse it
      const topProducts = dashChartsRes.data.topProducts || [];

      const tbody = document.querySelector('#topProductsTable tbody');
      if (tbody) {
        tbody.innerHTML = '';
        for (const tp of topProducts) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${escapeHtml(tp.name || tp.productId || '')}</td>
            <td>${escapeHtml(tp.category || '')}</td>
            <td>${tp.totalQuantity || 0}</td>
            <td>${fmtMoney(tp.totalRevenue || 0)}</td>
          `;
          tbody.appendChild(tr);
        }
      }

    } catch (err) {
      Ui.toast({ type: 'error', title: 'Reports error', message: err.message || 'Failed to load reports' });
    } finally {
      Ui.hideLoading();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnLoadReports');
    if (btn) btn.addEventListener('click', loadReports);
    loadReports();
  });
})();

