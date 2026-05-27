<?php
/**
 * ===========================================
 * SMART SHOP MANAGEMENT SYSTEM
 * Database Configuration using PDO
 * ===========================================
 */

// Database Credentials
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'shopping_system_db');

/**
 * Connects to the MySQL database via PDO.
 * 
 * @return PDO|null The PDO database connection instance, or null on error.
 */
function connectDB() {
    static $conn = null;
    
    if ($conn !== null) {
        return $conn;
    }
    
    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        $conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $conn;
    } catch (PDOException $e) {
        // Return JSON error response to client if in API context
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed: ' . $e->getMessage()
        ]);
        exit();
    }
}
