<?php

session_start();

// If the user is logged in, redirect to the dashboard; otherwise redirect to the login page
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php");
    exit();
} else {
    header("Location: login.php");
    exit();
}
?>
