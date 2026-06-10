<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php");
    exit();
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SMART SHOP MANAGEMENT SYSTEM - Login</title>
  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="assets/css/shop-theme.css" />
</head>
<body class="shop-theme">
  <div class="login-hero">
    <div class="login-card">
      <div class="login-card-top">
        <img class="login-logo" src="Shopping Logo.png" alt="Smart Shop Logo" />
        <div class="login-title">SMART SHOP</div>
        <div class="login-subtitle">Management System</div>
      </div>
      <div class="login-card-body">
        <form id="loginForm" novalidate>
          <div class="form-group">
            <label class="form-label" for="email">Email Address</label>
            <input class="form-input" id="email" name="email" type="email" placeholder="you@example.com" required />
            <div class="form-error" id="emailError"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input class="form-input" id="password" name="password" type="password" placeholder="••••••" required />
            <div class="form-error" id="passwordError"></div>
          </div>

          <button class="btn btn-primary w-100" id="btnSubmit" type="submit" style="margin-top: 0.5rem; padding: 0.75rem;">Sign In</button>

          <p class="text-muted" style="margin-top: 1rem; font-size: var(--font-size-xs); text-align: center;">
            Secured with PHP Session &amp; JWT authentication.
          </p>

          <div style="margin-top: 1rem;">
            <a class="btn btn-outline w-100" href="register.php">Create an Account</a>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toastContainer"></div>

  <script src="assets/js/api.js"></script>
  <script src="assets/js/ui.js"></script>
  <script src="assets/js/auth.js"></script>
</body>
</html>
