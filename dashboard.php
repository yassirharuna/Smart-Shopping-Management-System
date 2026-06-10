<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SMART SHOP MANAGEMENT SYSTEM - Dashboard</title>
  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="assets/css/shop-theme.css" />
</head>
<body class="shop-theme">
  <div class="app-container">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="logo-img-wrap">
          <img src="Shopping Logo.png" alt="Smart Shop Logo" />
        </div>
        <div class="logo-text">Smart Shop<span>Management System</span></div>
      </div>

      <nav class="sidebar-nav" aria-label="Primary navigation">
        <div class="nav-section">
          <div class="nav-section-title">Dashboard</div>
          <a class="nav-item active" href="dashboard.php" data-nav="dashboard">
            <span class="nav-icon">📊</span>
            <span>Overview</span>
          </a>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Management</div>
          <a class="nav-item" href="products.php" data-nav="products"><span class="nav-icon">📦</span><span>Products</span></a>
          <a class="nav-item" href="sales.php" data-nav="sales"><span class="nav-icon">🧾</span><span>Sales</span></a>
          <a class="nav-item" href="customers.php" data-nav="customers"><span class="nav-icon">👥</span><span>Customers</span></a>
          <a class="nav-item" href="reports.php" data-nav="reports"><span class="nav-icon">📈</span><span>Reports</span></a>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="btn btn-outline w-100" id="btnLogout" type="button">Logout</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="app-header">
        <div class="header-left">
          <button class="menu-toggle" id="menuToggle" type="button">☰</button>
          <div class="page-title">Dashboard</div>
        </div>
        <div class="header-right">
          <button class="header-btn" id="btnDarkMode" type="button" title="Toggle dark mode">🌙</button>
          <div class="user-menu" id="userMenu">
            <div class="user-avatar" id="userAvatar">U</div>
            <div class="user-info">
              <div class="user-name" id="userName">—</div>
              <div class="user-role" id="userRole">—</div>
            </div>
          </div>
        </div>
      </header>

      <section>
        <div class="grid grid-4" style="grid-template-columns: repeat(4, 1fr);">
          <div class="card">
            <div class="card-body">
              <div class="stat-card-enhanced">
                <div class="stat-icon-lg blue">📦</div>
                <div>
                  <div class="stat-label">Total Products</div>
                  <div class="stat-value" id="statTotalProducts">0</div>
                </div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <div class="stat-card-enhanced">
                <div class="stat-icon-lg green">🧾</div>
                <div>
                  <div class="stat-label">Total Sales</div>
                  <div class="stat-value" id="statTotalSales">0</div>
                </div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <div class="stat-card-enhanced">
                <div class="stat-icon-lg amber">💰</div>
                <div>
                  <div class="stat-label">Total Revenue</div>
                  <div class="stat-value" id="statTotalRevenue">0</div>
                </div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <div class="stat-card-enhanced">
                <div class="stat-icon-lg purple">🏪</div>
                <div>
                  <div class="stat-label">Inventory Value</div>
                  <div class="stat-value" id="statInventoryValue">0</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid" style="grid-template-columns: 1fr 1fr; margin-top: var(--spacing-lg);">
          <div class="card">
            <div class="card-header"><div class="card-title">Low Stock Alerts</div></div>
            <div class="card-body">
              <div style="display:flex; gap: 1rem; flex-wrap: wrap;">
                <span class="badge badge-warning">Low: <strong id="alertLowStock">0</strong></span>
                <span class="badge badge-danger">Out: <strong id="alertOutOfStock">0</strong></span>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Analytics</div></div>
            <div class="card-body">
              <div class="text-muted">Sales trend and top products are loaded via charts.</div>
            </div>
          </div>
        </div>

        <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top: var(--spacing-lg);">
          <div class="card">
            <div class="card-header"><div class="card-title">Sales Trend</div></div>
            <div class="card-body">
              <div class="chart-container">
                <canvas id="chartDailySales"></canvas>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div class="card-title">Recent Transactions</div></div>
            <div class="card-body">
              <div class="table-container">
                <table class="table" id="recentSalesTable">
                  <thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Date</th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
              <div id="recentSalesEmpty" class="empty-state d-none">
                <div class="empty-icon">🧾</div>
                <div class="empty-title">No sales yet</div>
                <div class="empty-text">Create a sale to see it here.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top: var(--spacing-lg);">
          <div class="card-header">
            <div class="card-title">🛒 Featured Products</div>
            <a href="products.php" class="btn btn-outline btn-sm">View All</a>
          </div>
          <div class="card-body">
            <div class="product-showcase" id="featuredProducts">
              <!-- Populated by JS -->
            </div>
          </div>
        </div>

      </section>
    </main>
  </div>

  <div class="toast-container" id="toastContainer"></div>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <script src="assets/js/api.js"></script>
  <script src="assets/js/ui.js"></script>
  <script src="assets/js/dashboard.js"></script>
  <script src="assets/js/auth.js"></script>
</body>
</html>
