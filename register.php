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
  <title>SMART SHOP MANAGEMENT SYSTEM - Register</title>
  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="assets/css/shop-theme.css" />
</head>
<body class="shop-theme">
  <div class="login-hero">
    <div class="login-card" style="max-width: 520px;">
      <div class="login-card-top">
        <img class="login-logo" src="Shopping Logo.png" alt="Smart Shop Logo" />
        <div class="login-title">Create Account</div>
        <div class="login-subtitle">Join Smart Shop Management System</div>
      </div>
      <div class="login-card-body">
        <form id="registerForm" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="name">Full Name</label>
              <input class="form-input" id="name" name="name" type="text" placeholder="Your name" required />
              <div class="form-error" id="nameError"></div>
            </div>
            <div class="form-group">
              <label class="form-label" for="phone">Phone (optional)</label>
              <input class="form-input" id="phone" name="phone" type="text" placeholder="e.g. +254..." />
              <div class="form-error" id="phoneError"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input class="form-input" id="email" name="email" type="email" placeholder="you@example.com" required />
            <div class="form-error" id="emailError"></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <div style="position:relative;">
                <input class="form-input" id="password" name="password" type="password" placeholder="At least 6 characters" required style="padding-right:2.8rem;" />
                <button type="button" id="togglePassword" tabindex="-1" style="position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1.1rem;color:#6ee7b7;padding:0;line-height:1;" title="Show/hide password">👁️</button>
              </div>
              <!-- Strength bar -->
              <div id="strengthBar" style="display:none;margin-top:0.5rem;">
                <div style="display:flex;gap:4px;margin-bottom:4px;">
                  <div class="strength-seg" id="seg1" style="flex:1;height:5px;border-radius:99px;background:#e5e7eb;transition:background 0.3s;"></div>
                  <div class="strength-seg" id="seg2" style="flex:1;height:5px;border-radius:99px;background:#e5e7eb;transition:background 0.3s;"></div>
                  <div class="strength-seg" id="seg3" style="flex:1;height:5px;border-radius:99px;background:#e5e7eb;transition:background 0.3s;"></div>
                  <div class="strength-seg" id="seg4" style="flex:1;height:5px;border-radius:99px;background:#e5e7eb;transition:background 0.3s;"></div>
                </div>
                <div id="strengthLabel" style="font-size:0.72rem;font-weight:600;"></div>
                <ul id="strengthHints" style="font-size:0.7rem;color:#6b7280;margin-top:4px;padding-left:1rem;line-height:1.7;"></ul>
              </div>
              <div class="form-error" id="passwordError"></div>
            </div>
            <div class="form-group">
              <label class="form-label" for="role">Role</label>
              <select class="form-select" id="role" name="role">
                <option value="">staff</option>
                <option value="admin">admin</option>
                <option value="staff">staff</option>
              </select>
              <div class="form-hint">Default role is staff.</div>
            </div>
          </div>

          <button class="btn btn-primary w-100" id="btnSubmit" type="submit" style="margin-top: 0.5rem; padding: 0.75rem;">Create Account</button>

          <div style="margin-top: 1rem;">
            <a class="btn btn-outline w-100" href="login.php">Back to Login</a>
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
