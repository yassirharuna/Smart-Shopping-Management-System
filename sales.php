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
  <title>SMART SHOP MANAGEMENT SYSTEM - Sales</title>
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
          <a class="nav-item" href="dashboard.php" data-nav="dashboard"><span class="nav-icon">📊</span><span>Overview</span></a>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Management</div>
          <a class="nav-item" href="products.php" data-nav="products"><span class="nav-icon">📦</span><span>Products</span></a>
          <a class="nav-item active" href="sales.php" data-nav="sales"><span class="nav-icon">🧾</span><span>Sales</span></a>
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
          <div class="page-title">Sales</div>
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

      <section style="margin-top: var(--spacing-lg);">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Create Sale</div>
            <div class="text-muted" id="saleInfo">Ready</div>
          </div>

          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="customerSelect">Customer (optional)</label>
                <select class="form-select" id="customerSelect">
                  <option value="">Walk-in Customer</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="paymentMethod">Payment Method</label>
                <select class="form-select" id="paymentMethod">
                  <option value="cash">cash</option>
                  <option value="card">card</option>
                  <option value="mobile_money">mobile_money</option>
                  <option value="cheque">cheque</option>
                  <option value="credit">credit</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="discountPercent">Discount %</label>
                <input class="form-input" id="discountPercent" type="number" min="0" max="100" value="0" />
              </div>
              <div class="form-group">
                <label class="form-label" for="taxRate">Tax %</label>
                <input class="form-input" id="taxRate" type="number" min="0" max="100" value="0" />
              </div>
              <div class="form-group">
                <label class="form-label" for="amountPaid">Amount Paid</label>
                <input class="form-input" id="amountPaid" type="number" min="0" value="0" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="notes">Notes (optional)</label>
              <textarea class="form-textarea" id="notes" placeholder="Optional"></textarea>
            </div>

            <hr style="border:none; border-top:1px solid var(--gray-200); margin: var(--spacing-lg) 0;" />

            <div class="form-row" style="align-items:end;">
              <div class="form-group">
                <label class="form-label" for="productSelect">Add Product</label>
                <select class="form-select" id="productSelect"></select>
              </div>
              <div class="form-group">
                <label class="form-label" for="productQty">Quantity</label>
                <input class="form-input" id="productQty" type="number" min="1" value="1" />
              </div>
              <div class="form-group">
                <button class="btn btn-primary w-100" id="btnAddItem" type="button">Add Item</button>
              </div>
            </div>

            <div class="table-container" style="margin-top: var(--spacing-md);">
              <table class="table" id="saleItemsTable">
                <thead>
                  <tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th><th></th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>

            <div style="display:flex; gap: var(--spacing-lg); flex-wrap: wrap; margin-top: var(--spacing-lg);">
              <div style="flex: 1; min-width: 260px;">
                <div class="card" style="box-shadow:none;">
                  <div class="card-header" style="border-bottom:none; margin-bottom: 0;">
                    <div class="card-title">Totals</div>
                  </div>
                  <div class="card-body" style="padding-top: 0;">
                    <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Subtotal</span><strong id="totalSubtotal">0</strong></div>
                    <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Discount</span><strong id="totalDiscount">0</strong></div>
                    <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Tax</span><strong id="totalTax">0</strong></div>
                    <div style="display:flex; justify-content: space-between; margin-top: 0.5rem;"><span class="text-muted">Grand Total</span><strong id="totalGrand">0</strong></div>
                  </div>
                </div>
              </div>

              <div style="min-width: 260px;">
                <button class="btn btn-success w-100" id="btnCompleteSale" type="button">Complete Sale</button>
                <div class="text-muted" style="margin-top: 0.75rem; font-size: var(--font-size-xs);">
                  Receipt will open after saving.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top: var(--spacing-lg);">
          <div class="card-header"><div class="card-title">Recent Sales</div></div>
          <div class="card-body">
            <div class="table-container">
              <table class="table" id="recentSalesTable">
                <thead><tr><th>Invoice</th><th>Customer</th><th>Payment</th><th>Total</th><th>Date</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- Receipt Modal -->
  <div class="modal-overlay" id="receiptOverlay">
    <div class="modal" style="max-width: 720px;">
      <div class="modal-header">
        <div class="modal-title">Receipt</div>
        <button class="modal-close" id="receiptClose" type="button">✕</button>
      </div>
      <div class="modal-body">
        <div id="receiptContent"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="btnPrint" type="button">Print</button>
        <button class="btn btn-outline" id="btnCloseReceipt" type="button">Close</button>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toastContainer"></div>

  <script src="assets/js/api.js"></script>
  <script src="assets/js/ui.js"></script>
  <script src="assets/js/sales.js"></script>
  <script src="assets/js/auth.js"></script>
</body>
</html>
