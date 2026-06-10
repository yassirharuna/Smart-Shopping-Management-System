<?php
$username = htmlspecialchars($_POST['username']);
$password = htmlspecialchars($_POST['password']);

echo "User Registered Successfully<br>";
echo "Username: " . $username;
?>