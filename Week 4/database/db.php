<?php

$conn = mysqli_connect("localhost", "root", "", "authdb");

if (!$conn) {
    die("Connection Failed");
}

echo "Database Connected Successfully";

?>