/*
  SMART SHOP MANAGEMENT SYSTEM
  Reports page logic — enhanced charts with teal theme
*/

(function () {
  let charts = [];

  const TEAL_PALETTE = [
    '#059669','#0d9488','#0891b2','#7c3aed','#f59e0b',
    '#ef4444','#10b981','#06b6d4','#8b5cf6','#f97316'
  ];

  function fmtMoney(n) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(n || 0));
  }

  function destroyCharts() {
    charts.forEach(c => c && c.destroy && c.destroy());
    charts = [];
  }

  const chartDefaults = {
    font: { family: "'Segoe UI', sans-serif", size: 12 },
    color: '#374151'
  };

  async function loadReports() {
    const days = Number(document.getElementById('days')?.value || 30);

    try {
      Ui.showLoading();
      destroyCharts();

      const end   = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);

      const [saleStatsRes, dashChartsRes] = await Promise.all([
        Api.saleStatistics(`?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        Api.dashboardCharts(`days=${days}`)
      ]);

      const byPayment    = saleStatsRes.data.byPaymentMethod || [];
      const daily        = dashChartsRes.data.dailySales     || [];
      const topProducts  = dashChartsRes.data.topProducts    || [];
      const byCategory   = dashChartsRes.data.salesByCategory || [];

      // ── 1. Sales Trend — Area Line Chart ──────────────────────────
      const salesCanvas = document.getElementById('chartReportsSales');
      if (salesCanvas) {
        const labels  = daily.map(r => { const id = r._id||{}; return `${id.month}/${id.day}`; });
        const revenue = daily.map(r => r.totalRevenue || 0);
        const counts  = daily.map(r => r.totalSales   || 0);

        charts.push(new Chart(salesCanvas.getContext('2d'), {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Revenue (KES)',
                data: revenue,
                borderColor: '#059669',
                backgroundColor: 'rgba(5,150,105,0.12)',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#059669',
                pointRadius: 4,
                yAxisID: 'yRevenue'
              },
              {
                label: 'No. of Sales',
                data: counts,
                borderColor: '#0891b2',
                backgroundColor: 'rgba(8,145,178,0.08)',
                borderWidth: 2,
                tension: 0.4,
                fill: false,
                pointBackgroundColor: '#0891b2',
                pointRadius: 3,
                borderDash: [5,3],
                yAxisID: 'ySales'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'top', labels: { ...chartDefaults.font, color: chartDefaults.color, usePointStyle: true } },
              tooltip: { callbacks: { label: ctx => ctx.dataset.yAxisID === 'yRevenue' ? fmtMoney(ctx.raw) : `${ctx.raw} sales` } }
            },
            scales: {
              yRevenue: { type: 'linear', position: 'left',  beginAtZero: true, ticks: { callback: v => fmtMoney(v), color: '#059669' }, grid: { color: 'rgba(16,185,129,0.08)' } },
              ySales:   { type: 'linear', position: 'right', beginAtZero: true, ticks: { color: '#0891b2' }, grid: { drawOnChartArea: false } },
              x: { ticks: { color: '#374151' }, grid: { color: 'rgba(0,0,0,0.04)' } }
            }
          }
        }));
      }

      // ── 2. Payment Method — Doughnut ──────────────────────────────
      const paymentCanvas = document.getElementById('chartPayment');
      if (paymentCanvas && byPayment.length) {
        charts.push(new Chart(paymentCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: byPayment.map(x => x._id || ''),
            datasets: [{
              data: byPayment.map(x => x.total || 0),
              backgroundColor: TEAL_PALETTE,
              borderWidth: 2,
              borderColor: '#fff',
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
              legend: { position: 'bottom', labels: { ...chartDefaults.font, color: chartDefaults.color, padding: 14, usePointStyle: true } },
              tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtMoney(ctx.raw)}` } }
            }
          }
        }));
      } else if (paymentCanvas) {
        paymentCanvas.parentElement.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">No payment data yet.</p>';
      }

      // ── 3. Category Distribution — Pie Chart ──────────────────────
      const catCanvas = document.getElementById('chartCategory');
      if (catCanvas && byCategory.length) {
        charts.push(new Chart(catCanvas.getContext('2d'), {
          type: 'pie',
          data: {
            labels: byCategory.map(x => x.category),
            datasets: [{
              data: byCategory.map(x => x.count),
              backgroundColor: TEAL_PALETTE,
              borderWidth: 2,
              borderColor: '#fff',
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { ...chartDefaults.font, color: chartDefaults.color, padding: 12, usePointStyle: true } },
              tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} products` } }
            }
          }
        }));
      } else if (catCanvas) {
        catCanvas.parentElement.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">No category data yet.</p>';
      }

      // ── 4. Top Products — Horizontal Bar ──────────────────────────
      const topCanvas = document.getElementById('chartTopProducts');
      if (topCanvas && topProducts.length) {
        charts.push(new Chart(topCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: topProducts.slice(0,8).map(p => p.name),
            datasets: [
              {
                label: 'Revenue (KES)',
                data: topProducts.slice(0,8).map(p => p.totalRevenue || 0),
                backgroundColor: 'rgba(5,150,105,0.75)',
                borderColor: '#059669',
                borderWidth: 1.5,
                borderRadius: 6,
                yAxisID: 'yRev'
              },
              {
                label: 'Units Sold',
                data: topProducts.slice(0,8).map(p => p.totalQuantity || 0),
                backgroundColor: 'rgba(8,145,178,0.65)',
                borderColor: '#0891b2',
                borderWidth: 1.5,
                borderRadius: 6,
                yAxisID: 'yQty'
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { ...chartDefaults.font, color: chartDefaults.color, usePointStyle: true } },
              tooltip: { callbacks: { label: ctx => ctx.dataset.yAxisID === 'yRev' ? ` ${fmtMoney(ctx.raw)}` : ` ${ctx.raw} units` } }
            },
            scales: {
              yRev: { type: 'linear', position: 'top',   beginAtZero: true, ticks: { callback: v => fmtMoney(v), color: '#059669' }, grid: { color: 'rgba(16,185,129,0.08)' } },
              yQty: { type: 'linear', position: 'bottom', beginAtZero: true, ticks: { color: '#0891b2' }, grid: { drawOnChartArea: false } },
              y: { ticks: { color: '#374151', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
            }
          }
        }));
      } else if (topCanvas) {
        topCanvas.parentElement.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">No sales data yet.</p>';
      }

      // ── 5. Top Products Table ──────────────────────────────────────
      const tbody = document.querySelector('#topProductsTable tbody');
      if (tbody) {
        tbody.innerHTML = '';
        topProducts.forEach((tp, i) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:999px;font-weight:700;font-size:0.75rem;">#${i+1}</span></td>
            <td style="font-weight:600;color:#065f46;">${escHtml(tp.name||tp.productId||'')}</td>
            <td><span style="background:#ecfdf5;color:#0d9488;padding:2px 8px;border-radius:6px;font-size:0.75rem;">${escHtml(tp.category||'')}</span></td>
            <td style="font-weight:600;">${tp.totalQuantity||0}</td>
            <td style="font-weight:700;color:#059669;">${fmtMoney(tp.totalRevenue||0)}</td>
          `;
          tbody.appendChild(tr);
        });
        if (!topProducts.length) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:2rem;">No sales data yet.</td></tr>';
        }
      }

    } catch (err) {
      Ui.toast({ type: 'error', title: 'Reports error', message: err.message || 'Failed to load reports' });
    } finally {
      Ui.hideLoading();
    }
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnLoadReports')?.addEventListener('click', loadReports);
    loadReports();
  });
})();
