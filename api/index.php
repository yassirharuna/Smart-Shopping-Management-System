<?php
/**
 * =======================================================
 * SMART SHOP MANAGEMENT SYSTEM - Central API Router
 * =======================================================
 * Handles all clean API endpoints routed via .htaccess.
 * Integrates PHP PDO with MongoDB-compatible response formats.
 * =======================================================
 */

// CORS & HTTP Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

// Start PHP Session safely if needed
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include Database Configuration
require_once __DIR__ . '/config/db.php';
$pdo = connectDB();

// -------------------------------------------------------
// JWT UTILITY FUNCTIONS
// -------------------------------------------------------
define('JWT_SECRET', 'smart_shop_system_jwt_secret_key_2026_safe');

function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

function generateJWT($payload) {
    $headers = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $base64UrlHeader = base64UrlEncode($headers);
    $base64UrlPayload = base64UrlEncode(json_encode($payload));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64UrlEncode($signature);
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    list($header, $payload, $signature) = $parts;
    $validSig = base64UrlEncode(hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true));
    if (!hash_equals($validSig, $signature)) {
        return false;
    }
    return json_decode(base64UrlDecode($payload), true);
}

// -------------------------------------------------------
// REQUEST AUTHENTICATION MIDDLEWARE
// -------------------------------------------------------
function getBearerToken() {
    $headers = getallheaders();
    $authHeader = '';
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            $authHeader = $value;
            break;
        }
    }
    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (empty($authHeader) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    if (!empty($authHeader)) {
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function getAuthenticatedUser($pdo) {
    $token = getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authorized to access this route. Please login.']);
        exit();
    }
    $decoded = verifyJWT($token);
    if (!$decoded || !isset($decoded['id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit();
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$decoded['id']]);
    $user = $stmt->fetch();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User no longer exists']);
        exit();
    }
    if (!$user['isActive']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User account is deactivated']);
        exit();
    }
    $user['_id'] = (string)$user['id'];
    return $user;
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------
function getStockStatus($quantity, $minStock) {
    if ($quantity <= 0) {
        return 'out_of_stock';
    } elseif ($quantity <= $minStock) {
        return 'low_stock';
    } else {
        return 'in_stock';
    }
}

// Helper to check route patterns and extract parameters
function matchRoute($pattern, $route, &$params = []) {
    $regex = preg_replace('/:id/', '(\d+)', $pattern);
    $regex = '#^' . $regex . '$#';
    if (preg_match($regex, $route, $matches)) {
        array_shift($matches);
        $params = $matches;
        return true;
    }
    return false;
}

// -------------------------------------------------------
// ROUTING PARSING
// -------------------------------------------------------
$route = $_GET['route'] ?? '';
$route = trim($route, '/');
$route = preg_replace('/\.php$/', '', $route);

$method = $_SERVER['REQUEST_METHOD'];
$inputJSON = file_get_contents('php://input');
$body = json_decode($inputJSON, true) ?? [];
$params = [];

try {
    // -------------------------------------------------------
    // AUTHENTICATION ROUTES
    // -------------------------------------------------------

    // POST /api/auth/login
    if ($method === 'POST' && matchRoute('auth/login', $route)) {
        $email = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Please provide email and password']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            exit();
        }

        if (!$user['isActive']) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Account is deactivated']);
            exit();
        }

        $token = generateJWT([
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => $user['id'],
                    '_id' => (string)$user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'phone' => $user['phone'],
                    'avatar' => $user['avatar'],
                    'createdAt' => $user['created_at']
                ],
                'token' => $token
            ]
        ]);
        exit();
    }

    // POST /api/auth/register
    elseif ($method === 'POST' && matchRoute('auth/register', $route)) {
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';
        $role = $body['role'] ?? 'staff';
        $phone = trim($body['phone'] ?? '');

        if (empty($name) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name, email, and password are required']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Email already registered']);
            exit();
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hashedPassword, $role, $phone]);
        $newId = $pdo->lastInsertId();

        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$newId]);
        $user = $stmt->fetch();

        $token = generateJWT([
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => [
                'user' => [
                    'id' => $user['id'],
                    '_id' => (string)$user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'phone' => $user['phone'],
                    'avatar' => $user['avatar'],
                    'createdAt' => $user['created_at']
                ],
                'token' => $token
            ]
        ]);
        exit();
    }

    // POST /api/auth/set_session
    elseif ($method === 'POST' && matchRoute('auth/set_session', $route)) {
        if (isset($body['user'])) {
            $_SESSION['user_id'] = $body['user']['id'] ?? $body['user']['_id'] ?? null;
            $_SESSION['user_email'] = $body['user']['email'] ?? null;
            $_SESSION['user_name'] = $body['user']['name'] ?? null;
            $_SESSION['user_role'] = $body['user']['role'] ?? null;
        }
        echo json_encode(['success' => true]);
        exit();
    }

    // POST /api/auth/logout
    elseif ($method === 'POST' && matchRoute('auth/logout', $route)) {
        session_destroy();
        echo json_encode(['success' => true]);
        exit();
    }

    // -------------------------------------------------------
    // DASHBOARD & ANALYTICS ROUTES (Protected)
    // -------------------------------------------------------

    // GET /api/dashboard/stats
    elseif ($method === 'GET' && matchRoute('dashboard/stats', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        // 1. Total Products
        $totalProducts = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();

        // 2. Low/Out Stock alerts
        $lowStock = $pdo->query("SELECT COUNT(*) FROM products WHERE stockStatus = 'low_stock'")->fetchColumn();
        $outOfStock = $pdo->query("SELECT COUNT(*) FROM products WHERE stockStatus = 'out_of_stock'")->fetchColumn();

        // 3. Sales revenue completed
        $salesStats = $pdo->query("SELECT COUNT(*) as totalSales, SUM(total) as totalRevenue FROM sales WHERE status = 'completed'")->fetch();

        // 4. Total Customers
        $totalCustomers = $pdo->query("SELECT COUNT(*) FROM customers WHERE isActive = 1")->fetchColumn();

        // 5. Total Users
        $totalUsers = $pdo->query("SELECT COUNT(*) FROM users WHERE isActive = 1")->fetchColumn();

        // 6. Inventory Value
        $inventoryValue = $pdo->query("SELECT SUM(quantity * buyingPrice) FROM products")->fetchColumn();

        echo json_encode([
            'success' => true,
            'data' => [
                'overview' => [
                    'totalProducts' => (int)$totalProducts,
                    'totalSales' => (int)($salesStats['totalSales'] ?? 0),
                    'totalRevenue' => (float)($salesStats['totalRevenue'] ?? 0),
                    'totalCustomers' => (int)$totalCustomers,
                    'totalUsers' => (int)$totalUsers,
                    'inventoryValue' => (float)($inventoryValue ?? 0)
                ],
                'alerts' => [
                    'lowStock' => (int)$lowStock,
                    'outOfStock' => (int)$outOfStock
                ]
            ]
        ]);
        exit();
    }

    // GET /api/dashboard/charts
    elseif ($method === 'GET' && matchRoute('dashboard/charts', $route)) {
        $currentUser = getAuthenticatedUser($pdo);
        $days = (int)($_GET['days'] ?? 30);
        $startDate = date('Y-m-d H:i:s', strtotime("-$days days"));

        // 1. Daily sales
        $stmt = $pdo->prepare("
            SELECT YEAR(saleDate) as yr, MONTH(saleDate) as mo, DAY(saleDate) as dy, COUNT(*) as count, SUM(total) as revenue 
            FROM sales 
            WHERE status = 'completed' AND saleDate >= ?
            GROUP BY YEAR(saleDate), MONTH(saleDate), DAY(saleDate)
            ORDER BY yr ASC, mo ASC, dy ASC
        ");
        $stmt->execute([$startDate]);
        $dailySales = [];
        while ($r = $stmt->fetch()) {
            $dailySales[] = [
                '_id' => [
                    'year' => (int)$r['yr'],
                    'month' => (int)$r['mo'],
                    'day' => (int)$r['dy']
                ],
                'totalSales' => (int)$r['count'],
                'totalRevenue' => (float)$r['revenue']
            ];
        }

        // 2. Sales by Category
        $salesByCategory = [];
        $stmt = $pdo->query("
            SELECT category, COUNT(*) as count, SUM(quantity * sellingPrice) as totalValue 
            FROM products 
            GROUP BY category 
            ORDER BY count DESC 
            LIMIT 10
        ");
        while ($r = $stmt->fetch()) {
            $salesByCategory[] = [
                'category' => $r['category'],
                'count' => (int)$r['count'],
                'totalValue' => (float)$r['totalValue']
            ];
        }

        // 3. Sales by Payment method
        $salesByPayment = [];
        $stmt = $pdo->prepare("
            SELECT paymentMethod as _id, COUNT(*) as count, SUM(total) as total 
            FROM sales 
            WHERE status = 'completed' AND saleDate >= ?
            GROUP BY paymentMethod
        ");
        $stmt->execute([$startDate]);
        while ($r = $stmt->fetch()) {
            $salesByPayment[] = [
                '_id' => $r['_id'],
                'count' => (int)$r['count'],
                'total' => (float)$r['total']
            ];
        }

        // 4. Top Selling Products
        $topProducts = [];
        $stmt = $pdo->prepare("
            SELECT si.product_id, si.productName as name, p.category, SUM(si.quantity) as totalQuantity, SUM(si.subtotal) as totalRevenue 
            FROM sale_items si
            INNER JOIN sales s ON si.sale_id = s.id
            LEFT JOIN products p ON si.product_id = p.id
            WHERE s.status = 'completed' AND s.saleDate >= ?
            GROUP BY si.product_id, si.productName, p.category
            ORDER BY totalQuantity DESC 
            LIMIT 10
        ");
        $stmt->execute([$startDate]);
        while ($r = $stmt->fetch()) {
            $topProducts[] = [
                'productId' => (string)$r['product_id'],
                '_id' => (string)$r['product_id'],
                'name' => $r['name'],
                'category' => $r['category'] ?? 'Other',
                'totalQuantity' => (int)$r['totalQuantity'],
                'totalRevenue' => (float)$r['totalRevenue']
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'dailySales' => $dailySales,
                'salesByCategory' => $salesByCategory,
                'salesByPayment' => $salesByPayment,
                'topProducts' => $topProducts
            ]
        ]);
        exit();
    }

    // GET /api/dashboard/activities
    elseif ($method === 'GET' && matchRoute('dashboard/activities', $route)) {
        $currentUser = getAuthenticatedUser($pdo);
        $limit = (int)($_GET['limit'] ?? 10);

        // Recent sales
        $recentSales = [];
        $stmt = $pdo->prepare("
            SELECT s.*, c.name as customerNameVal, u.name as staffNameVal 
            FROM sales s 
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.staff_id = u.id
            WHERE s.status = 'completed' 
            ORDER BY s.saleDate DESC 
            LIMIT ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        while ($r = $stmt->fetch()) {
            $recentSales[] = [
                'id' => $r['id'],
                '_id' => (string)$r['id'],
                'invoiceNumber' => $r['invoiceNumber'],
                'total' => (float)$r['total'],
                'saleDate' => $r['saleDate'],
                'paymentMethod' => $r['paymentMethod'],
                'customer' => $r['customer_id'] ? [
                    'id' => $r['customer_id'],
                    '_id' => (string)$r['customer_id'],
                    'name' => $r['customerNameVal']
                ] : null,
                'staff' => [
                    'id' => $r['staff_id'],
                    '_id' => (string)$r['staff_id'],
                    'name' => $r['staffNameVal']
                ]
            ];
        }

        // Recent Movements
        $recentMovements = [];
        $stmt = $pdo->prepare("
            SELECT i.*, p.name as productNameVal, u.name as userNameVal 
            FROM inventory i
            LEFT JOIN products p ON i.product_id = p.id
            LEFT JOIN users u ON i.user_id = u.id
            ORDER BY i.movementDate DESC 
            LIMIT ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        while ($r = $stmt->fetch()) {
            $recentMovements[] = [
                'id' => $r['id'],
                '_id' => (string)$r['id'],
                'productName' => $r['productName'],
                'type' => $r['type'],
                'quantity' => (int)$r['quantity'],
                'previousQuantity' => (int)$r['previousQuantity'],
                'newQuantity' => (int)$r['newQuantity'],
                'reason' => $r['reason'],
                'movementDate' => $r['movementDate'],
                'product' => [
                    'id' => $r['product_id'],
                    '_id' => (string)$r['product_id'],
                    'name' => $r['productNameVal']
                ],
                'user' => [
                    'id' => $r['user_id'],
                    '_id' => (string)$r['user_id'],
                    'name' => $r['userNameVal']
                ]
            ];
        }

        // New Customers
        $newCustomers = [];
        $stmt = $pdo->prepare("SELECT * FROM customers ORDER BY dateRegistered DESC LIMIT ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        while ($r = $stmt->fetch()) {
            $r['id'] = $r['id'];
            $r['_id'] = (string)$r['id'];
            $newCustomers[] = $r;
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'recentSales' => $recentSales,
                'recentMovements' => $recentMovements,
                'newCustomers' => $newCustomers
            ]
        ]);
        exit();
    }

    // -------------------------------------------------------
    // PRODUCT API ROUTES (Protected)
    // -------------------------------------------------------

    // GET /api/products/utils/categories
    elseif ($method === 'GET' && matchRoute('products/utils/categories', $route)) {
        $currentUser = getAuthenticatedUser($pdo);
        echo json_encode([
            'success' => true,
            'data' => [
                'categories' => ['Groceries', 'Accessories', 'Devices', 'Food', 'Clothing', 'Cosmetics', 'Gadgets', 'Furniture', 'Other']
            ]
        ]);
        exit();
    }

    // GET /api/products/utils/statistics
    elseif ($method === 'GET' && matchRoute('products/utils/statistics', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $totalProducts = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();

        $byCategory = [];
        $stmt = $pdo->query("SELECT category, COUNT(*) as count, SUM(quantity * buyingPrice) as totalValue FROM products GROUP BY category");
        while ($r = $stmt->fetch()) {
            $byCategory[] = [
                'category' => $r['category'],
                'count' => (int)$r['count'],
                'totalValue' => (float)$r['totalValue']
            ];
        }

        $stock = $pdo->query("SELECT stockStatus, COUNT(*) as count FROM products GROUP BY stockStatus")->fetchAll();
        $stockCounts = ['in_stock' => 0, 'low_stock' => 0, 'out_of_stock' => 0];
        foreach ($stock as $s) {
            $stockCounts[$s['stockStatus']] = (int)$s['count'];
        }

        $valData = $pdo->query("SELECT SUM(quantity * buyingPrice) as totalValue, SUM(quantity * sellingPrice) as potentialRevenue FROM products")->fetch();

        echo json_encode([
            'success' => true,
            'data' => [
                'totalProducts' => (int)$totalProducts,
                'byCategory' => $byCategory,
                'stockStatus' => $stockCounts,
                'inventoryValue' => [
                    'totalValue' => (float)($valData['totalValue'] ?? 0),
                    'potentialRevenue' => (float)($valData['potentialRevenue'] ?? 0)
                ]
            ]
        ]);
        exit();
    }

    // GET /api/products
    elseif ($method === 'GET' && matchRoute('products', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 10);
        $search = trim($_GET['search'] ?? '');
        $category = trim($_GET['category'] ?? '');
        $stockStatus = trim($_GET['stockStatus'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $sortBy = trim($_GET['sortBy'] ?? 'createdAt');
        $sortOrder = trim($_GET['sortOrder'] ?? 'desc');

        $where = [];
        $args = [];

        if ($search !== '') {
            $where[] = "(name LIKE ? OR description LIKE ? OR barcode LIKE ?)";
            $args[] = "%$search%";
            $args[] = "%$search%";
            $args[] = "%$search%";
        }
        if ($category !== '') {
            $where[] = "category = ?";
            $args[] = $category;
        }
        if ($stockStatus !== '') {
            $where[] = "stockStatus = ?";
            $args[] = $stockStatus;
        }
        if ($status !== '') {
            $where[] = "status = ?";
            $args[] = $status;
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Sorting mapping
        $allowedSort = [
            'id' => 'id', 'name' => 'name', 'category' => 'category', 'quantity' => 'quantity',
            'buyingPrice' => 'buyingPrice', 'sellingPrice' => 'sellingPrice', 'stockStatus' => 'stockStatus',
            'status' => 'status', 'createdAt' => 'created_at', 'dateAdded' => 'dateAdded'
        ];
        $sortByCol = $allowedSort[$sortBy] ?? 'created_at';
        $sortOrderDir = (strtolower($sortOrder) === 'asc') ? 'ASC' : 'DESC';

        // Count totals matching query
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM products $whereClause");
        $stmt->execute($args);
        $total = $stmt->fetchColumn();

        // Query Products
        $offset = ($page - 1) * $limit;
        $stmt = $pdo->prepare("
            SELECT * FROM products $whereClause 
            ORDER BY $sortByCol $sortOrderDir 
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($args);
        $productsList = [];
        while ($row = $stmt->fetch()) {
            $row['id'] = (int)$row['id'];
            $row['_id'] = (string)$row['id'];
            $row['buyingPrice'] = (float)$row['buyingPrice'];
            $row['sellingPrice'] = (float)$row['sellingPrice'];
            $row['quantity'] = (int)$row['quantity'];
            $row['minStock'] = (int)$row['minStock'];
            $row['profitMargin'] = (float)$row['profitMargin'];
            $productsList[] = $row;
        }

        // Aggregate Stock status counts over filters
        $stmt = $pdo->prepare("SELECT stockStatus, COUNT(*) as count FROM products $whereClause GROUP BY stockStatus");
        $stmt->execute($args);
        $stockCounts = ['in_stock' => 0, 'low_stock' => 0, 'out_of_stock' => 0];
        while ($r = $stmt->fetch()) {
            $stockCounts[$r['stockStatus']] = (int)$r['count'];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'products' => $productsList,
                'pagination' => [
                    'total' => (int)$total,
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($total / $limit)
                ],
                'stockCounts' => $stockCounts
            ]
        ]);
        exit();
    }

    // GET /api/products/:id
    elseif ($method === 'GET' && matchRoute('products/:id', $route, $params)) {
        $currentUser = getAuthenticatedUser($pdo);
        $id = $params[0];

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }

        $product['id'] = (int)$product['id'];
        $product['_id'] = (string)$product['id'];
        $product['buyingPrice'] = (float)$product['buyingPrice'];
        $product['sellingPrice'] = (float)$product['sellingPrice'];
        $product['quantity'] = (int)$product['quantity'];
        $product['minStock'] = (int)$product['minStock'];
        $product['profitMargin'] = (float)$product['profitMargin'];

        echo json_encode([
            'success' => true,
            'data' => ['product' => $product]
        ]);
        exit();
    }

    // POST /api/products
    elseif ($method === 'POST' && matchRoute('products', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $name = trim($body['name'] ?? '');
        $description = trim($body['description'] ?? '');
        $category = trim($body['category'] ?? '');
        $barcode = trim($body['barcode'] ?? '');
        $quantity = (int)($body['quantity'] ?? 0);
        $minStock = (int)($body['minStock'] ?? 10);
        $buyingPrice = (float)($body['buyingPrice'] ?? 0);
        $sellingPrice = (float)($body['sellingPrice'] ?? 0);
        $status = $body['status'] ?? 'active';

        if (empty($name) || empty($category) || $buyingPrice < 0 || $sellingPrice < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid name, category, prices are required']);
            exit();
        }

        if ($barcode !== '') {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE barcode = ?");
            $stmt->execute([$barcode]);
            if ($stmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Barcode already exists']);
                exit();
            }
        }

        $profitMargin = $buyingPrice > 0 ? (($sellingPrice - $buyingPrice) / $buyingPrice) * 100 : 0;
        $stockStatus = getStockStatus($quantity, $minStock);

        $stmt = $pdo->prepare("
            INSERT INTO products (name, description, category, barcode, quantity, minStock, buyingPrice, sellingPrice, status, stockStatus, profitMargin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$name, $description, $category, $barcode === '' ? null : $barcode, $quantity, $minStock, $buyingPrice, $sellingPrice, $status, $stockStatus, $profitMargin]);
        $newId = $pdo->lastInsertId();

        // Create initial stock movement in inventory
        if ($quantity > 0) {
            $stmt = $pdo->prepare("
                INSERT INTO inventory (product_id, productName, type, quantity, previousQuantity, newQuantity, user_id, userName, reason, costPerUnit, totalValue)
                VALUES (?, ?, 'purchase', ?, 0, ?, ?, ?, 'Initial stock', ?, ?)
            ");
            $stmt->execute([$newId, $name, $quantity, $quantity, $currentUser['id'], $currentUser['name'], $buyingPrice, $buyingPrice * $quantity]);
        }

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$newId]);
        $product = $stmt->fetch();
        $product['id'] = (int)$product['id'];
        $product['_id'] = (string)$product['id'];

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Product created successfully',
            'data' => ['product' => $product]
        ]);
        exit();
    }

    // PUT /api/products/:id
    elseif ($method === 'PUT' && matchRoute('products/:id', $route, $params)) {
        $currentUser = getAuthenticatedUser($pdo);
        $id = $params[0];

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $currentProduct = $stmt->fetch();

        if (!$currentProduct) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit();
        }

        $name = trim($body['name'] ?? $currentProduct['name']);
        $description = trim($body['description'] ?? $currentProduct['description']);
        $category = trim($body['category'] ?? $currentProduct['category']);
        $barcode = trim($body['barcode'] ?? $currentProduct['barcode']);
        $quantity = isset($body['quantity']) ? (int)$body['quantity'] : (int)$currentProduct['quantity'];
        $minStock = isset($body['minStock']) ? (int)$body['minStock'] : (int)$currentProduct['minStock'];
        $buyingPrice = isset($body['buyingPrice']) ? (float)$body['buyingPrice'] : (float)$currentProduct['buyingPrice'];
        $sellingPrice = isset($body['sellingPrice']) ? (float)$body['sellingPrice'] : (float)$currentProduct['sellingPrice'];
        $status = $body['status'] ?? $currentProduct['status'];

        if ($barcode !== '' && $barcode !== $currentProduct['barcode']) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE barcode = ? AND id != ?");
            $stmt->execute([$barcode, $id]);
            if ($stmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Barcode already exists']);
                exit();
            }
        }

        // Inventory adjustment check
        if ($quantity !== (int)$currentProduct['quantity']) {
            $diff = $quantity - (int)$currentProduct['quantity'];
            $stmt = $pdo->prepare("
                INSERT INTO inventory (product_id, productName, type, quantity, previousQuantity, newQuantity, user_id, userName, reason, costPerUnit, totalValue)
                VALUES (?, ?, 'adjustment', ?, ?, ?, ?, ?, 'Stock adjustment', ?, ?)
            ");
            $stmt->execute([$id, $name, $diff, $currentProduct['quantity'], $quantity, $currentUser['id'], $currentUser['name'], $buyingPrice, $buyingPrice * abs($diff)]);
        }

        $profitMargin = $buyingPrice > 0 ? (($sellingPrice - $buyingPrice) / $buyingPrice) * 100 : 0;
        $stockStatus = getStockStatus($quantity, $minStock);

        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, description = ?, category = ?, barcode = ?, quantity = ?, minStock = ?, buyingPrice = ?, sellingPrice = ?, status = ?, stockStatus = ?, profitMargin = ?
            WHERE id = ?
        ");
        $stmt->execute([$name, $description, $category, $barcode === '' ? null : $barcode, $quantity, $minStock, $buyingPrice, $sellingPrice, $status, $stockStatus, $profitMargin, $id]);

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        $product['id'] = (int)$product['id'];
        $product['_id'] = (string)$product['id'];

        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully',
            'data' => ['product' => $product]
        ]);
        exit();
    }

    // DELETE /api/products/:id
    elseif ($method === 'DELETE' && matchRoute('products/:id', $route, $params)) {
        $currentUser = getAuthenticatedUser($pdo);
        $id = $params[0];

        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
        exit();
    }

    // POST /api/products/upload-image
    elseif ($method === 'POST' && matchRoute('products/upload-image', $route)) {
        $currentUser = getAuthenticatedUser($pdo);
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $tempPath = $_FILES['image']['tmp_name'];
            $originalName = basename($_FILES['image']['name']);
            $ext = pathinfo($originalName, PATHINFO_EXTENSION);
            $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (in_array(strtolower($ext), $allowedExts)) {
                $newFilename = uniqid('prod_', true) . '.' . $ext;
                $destPath = __DIR__ . '/../' . $newFilename;
                if (move_uploaded_file($tempPath, $destPath)) {
                    echo json_encode([
                        'success' => true,
                        'data' => ['imageUrl' => $newFilename]
                    ]);
                    exit();
                }
            }
        }
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Image upload failed']);
        exit();
    }

    // -------------------------------------------------------
    // CUSTOMER API ROUTES (Protected)
    // -------------------------------------------------------

    // GET /api/customers/list/all
    elseif ($method === 'GET' && matchRoute('customers/list/all', $route)) {
        $currentUser = getAuthenticatedUser($pdo);
        $search = trim($_GET['search'] ?? '');

        $where = ["isActive = 1"];
        $args = [];

        if ($search !== '') {
            $where[] = "(name LIKE ? OR phone LIKE ? OR email LIKE ?)";
            $args[] = "%$search%";
            $args[] = "%$search%";
            $args[] = "%$search%";
        }

        $whereClause = "WHERE " . implode(" AND ", $where);
        $stmt = $pdo->prepare("SELECT id, name, phone, email, loyaltyPoints, membershipTier FROM customers $whereClause ORDER BY name ASC LIMIT 50");
        $stmt->execute($args);
        $customers = [];
        while ($r = $stmt->fetch()) {
            $r['id'] = (int)$r['id'];
            $r['_id'] = (string)$r['id'];
            $r['loyaltyPoints'] = (int)$r['loyaltyPoints'];
            $customers[] = $r;
        }

        echo json_encode(['success' => true, 'data' => ['customers' => $customers]]);
        exit();
    }

    // GET /api/customers/statistics
    elseif ($method === 'GET' && matchRoute('customers/statistics', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $totalCustomers = $pdo->query("SELECT COUNT(*) FROM customers")->fetchColumn();
        $activeCustomers = $pdo->query("SELECT COUNT(*) FROM customers WHERE isActive = 1")->fetchColumn();

        $tiers = $pdo->query("SELECT membershipTier, COUNT(*) as count FROM customers GROUP BY membershipTier")->fetchAll();
        $byTier = ['bronze' => 0, 'silver' => 0, 'gold' => 0, 'platinum' => 0];
        foreach ($tiers as $t) {
            $byTier[$t['membershipTier']] = (int)$t['count'];
        }

        $topSpent = [];
        $stmt = $pdo->query("SELECT id, name, email, totalSpent, membershipTier FROM customers ORDER BY totalSpent DESC LIMIT 10");
        while ($r = $stmt->fetch()) {
            $r['id'] = (int)$r['id'];
            $r['_id'] = (string)$r['id'];
            $r['totalSpent'] = (float)$r['totalSpent'];
            $topSpent[] = $r;
        }

        $totalRevenue = $pdo->query("SELECT SUM(totalSpent) FROM customers")->fetchColumn();

        echo json_encode([
            'success' => true,
            'data' => [
                'totalCustomers' => (int)$totalCustomers,
                'activeCustomers' => (int)$activeCustomers,
                'inactiveCustomers' => (int)($totalCustomers - $activeCustomers),
                'byTier' => $byTier,
                'topCustomers' => $topSpent,
                'totalRevenue' => (float)($totalRevenue ?? 0)
            ]
        ]);
        exit();
    }

    // GET /api/customers
    elseif ($method === 'GET' && matchRoute('customers', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 10);
        $search = trim($_GET['search'] ?? '');
        $membershipTier = trim($_GET['membershipTier'] ?? '');
        $isActive = trim($_GET['isActive'] ?? '');
        $sortBy = trim($_GET['sortBy'] ?? 'createdAt');
        $sortOrder = trim($_GET['sortOrder'] ?? 'desc');

        $where = [];
        $args = [];

        if ($search !== '') {
            $where[] = "(name LIKE ? OR email LIKE ? OR phone LIKE ?)";
            $args[] = "%$search%";
            $args[] = "%$search%";
            $args[] = "%$search%";
        }
        if ($membershipTier !== '') {
            $where[] = "membershipTier = ?";
            $args[] = $membershipTier;
        }
        if ($isActive !== '') {
            $where[] = "isActive = ?";
            $args[] = ($isActive === 'true') ? 1 : 0;
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $allowedSort = [
            'id' => 'id', 'name' => 'name', 'email' => 'email', 'phone' => 'phone',
            'membershipTier' => 'membershipTier', 'totalSpent' => 'totalSpent', 'createdAt' => 'created_at'
        ];
        $sortByCol = $allowedSort[$sortBy] ?? 'created_at';
        $sortOrderDir = (strtolower($sortOrder) === 'asc') ? 'ASC' : 'DESC';

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM customers $whereClause");
        $stmt->execute($args);
        $total = $stmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $stmt = $pdo->prepare("
            SELECT * FROM customers $whereClause 
            ORDER BY $sortByCol $sortOrderDir 
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($args);

        $list = [];
        while ($row = $stmt->fetch()) {
            $row['id'] = (int)$row['id'];
            $row['_id'] = (string)$row['id'];
            $row['loyaltyPoints'] = (int)$row['loyaltyPoints'];
            $row['totalSpent'] = (float)$row['totalSpent'];
            $row['totalPurchases'] = (int)$row['totalPurchases'];
            $row['isActive'] = (bool)$row['isActive'];

            // Mongoose Address nesting bridge
            $row['address'] = [
                'street' => $row['street'],
                'city' => $row['city'],
                'state' => $row['state'],
                'zipCode' => $row['zipCode'],
                'country' => $row['country']
            ];
            $list[] = $row;
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'customers' => $list,
                'pagination' => [
                    'total' => (int)$total,
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($total / $limit)
                ]
            ]
        ]);
        exit();
    }

    // GET /api/customers/:id/details
    elseif ($method === 'GET' && matchRoute('customers/:id/details', $route, $params)) {
        $currentUser = getAuthenticatedUser($pdo);
        $id = $params[0];

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        $customer = $stmt->fetch();

        if (!$customer) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Customer not found']);
            exit();
        }

        $customer['id'] = (int)$customer['id'];
        $customer['_id'] = (string)$customer['id'];
        $customer['loyaltyPoints'] = (int)$customer['loyaltyPoints'];
        $customer['totalSpent'] = (float)$customer['totalSpent'];
        $customer['totalPurchases'] = (int)$customer['totalPurchases'];
        $customer['address'] = [
            'street' => $customer['street'],
            'city' => $customer['city'],
            'state' => $customer['state'],
            'zipCode' => $customer['zipCode'],
            'country' => $customer['country']
        ];

        // Purchases history
        $purchases = [];
        $stmt = $pdo->prepare("
            SELECT s.*, u.name as staffNameVal 
            FROM sales s 
            LEFT JOIN users u ON s.staff_id = u.id 
            WHERE s.customer_id = ? 
            ORDER BY s.saleDate DESC 
            LIMIT 20
        ");
        $stmt->execute([$id]);
        while ($r = $stmt->fetch()) {
            $purchases[] = [
                'id' => $r['id'],
                '_id' => (string)$r['id'],
                'invoiceNumber' => $r['invoiceNumber'],
                'total' => (float)$r['total'],
                'saleDate' => $r['saleDate'],
                'staff' => [
                    'id' => $r['staff_id'],
                    '_id' => (string)$r['staff_id'],
                    'name' => $r['staffNameVal']
                ]
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'customer' => $customer,
                'purchases' => $purchases
            ]
        ]);
        exit();
    }

    // POST /api/customers
    elseif ($method === 'POST' && matchRoute('customers', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $phone = trim($body['phone'] ?? '');
        $notes = trim($body['notes'] ?? '');
        $isActive = ($body['isActive'] ?? true) ? 1 : 0;

        $address = $body['address'] ?? [];
        $street = trim($address['street'] ?? '');
        $city = trim($address['city'] ?? '');
        $state = trim($address['state'] ?? '');
        $zipCode = trim($address['zipCode'] ?? '');
        $country = trim($address['country'] ?? 'Kenya');

        if (empty($name) || empty($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Customer name and phone number are required']);
            exit();
        }

        if ($email !== '') {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM customers WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Email already registered']);
                exit();
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO customers (name, email, phone, street, city, state, zipCode, country, notes, isActive) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$name, $email === '' ? null : $email, $phone, $street, $city, $state, $zipCode, $country, $notes, $isActive]);
        $newId = $pdo->lastInsertId();

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$newId]);
        $customer = $stmt->fetch();
        $customer['id'] = (int)$customer['id'];
        $customer['_id'] = (string)$customer['id'];

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Customer created successfully',
            'data' => ['customer' => $customer]
        ]);
        exit();
    }

    // PUT /api/customers/:id
    elseif ($method === 'PUT' && matchRoute('customers/:id', $route, $params)) {
        $currentUser = getAuthenticatedUser($pdo);
        $id = $params[0];

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        $currentCustomer = $stmt->fetch();

        if (!$currentCustomer) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Customer not found']);
            exit();
        }

        $name = trim($body['name'] ?? $currentCustomer['name']);
        $email = trim($body['email'] ?? $currentCustomer['email']);
        $phone = trim($body['phone'] ?? $currentCustomer['phone']);
        $notes = trim($body['notes'] ?? $currentCustomer['notes']);
        $isActive = isset($body['isActive']) ? (($body['isActive'] === true) ? 1 : 0) : $currentCustomer['isActive'];

        $address = $body['address'] ?? [];
        $street = trim($address['street'] ?? $currentCustomer['street']);
        $city = trim($address['city'] ?? $currentCustomer['city']);
        $state = trim($address['state'] ?? $currentCustomer['state']);
        $zipCode = trim($address['zipCode'] ?? $currentCustomer['zipCode']);
        $country = trim($address['country'] ?? $currentCustomer['country']);

        if ($email !== '' && $email !== $currentCustomer['email']) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM customers WHERE email = ? AND id != ?");
            $stmt->execute([$email, $id]);
            if ($stmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Email already registered']);
                exit();
            }
        }

        $stmt = $pdo->prepare("
            UPDATE customers 
            SET name = ?, email = ?, phone = ?, street = ?, city = ?, state = ?, zipCode = ?, country = ?, notes = ?, isActive = ? 
            WHERE id = ?
        ");
        $stmt->execute([$name, $email === '' ? null : $email, $phone, $street, $city, $state, $zipCode, $country, $notes, $isActive, $id]);

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        $customer = $stmt->fetch();
        $customer['id'] = (int)$customer['id'];
        $customer['_id'] = (string)$customer['id'];

        echo json_encode([
            'success' => true,
            'message' => 'Customer updated successfully',
            'data' => ['customer' => $customer]
        ]);
        exit();
    }

    // DELETE /api/customers/:id
    elseif ($method === 'DELETE' && matchRoute('customers/:id', $route, $params)) {
        $currentUser = getAuthenticatedUser($pdo);
        $id = $params[0];

        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Customer deleted successfully']);
        exit();
    }

    // -------------------------------------------------------
    // SALES & POINT OF SALE (POS) ROUTES (Protected)
    // -------------------------------------------------------

    // GET /api/sales/recent
    elseif ($method === 'GET' && matchRoute('sales/recent', $route)) {
        $currentUser = getAuthenticatedUser($pdo);
        $limit = (int)($_GET['limit'] ?? 10);

        $sales = [];
        $stmt = $pdo->prepare("
            SELECT s.*, c.name as customerNameVal, u.name as staffNameVal 
            FROM sales s 
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.staff_id = u.id
            WHERE s.status = 'completed'
            ORDER BY s.saleDate DESC 
            LIMIT ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        while ($r = $stmt->fetch()) {
            $sales[] = [
                'id' => $r['id'],
                '_id' => (string)$r['id'],
                'invoiceNumber' => $r['invoiceNumber'],
                'total' => (float)$r['total'],
                'saleDate' => $r['saleDate'],
                'paymentMethod' => $r['paymentMethod'],
                'customer' => [
                    'name' => $r['customerNameVal'] ?? $r['customerName']
                ],
                'staff' => [
                    'name' => $r['staffNameVal']
                ]
            ];
        }

        echo json_encode(['success' => true, 'data' => ['sales' => $sales]]);
        exit();
    }

    // GET /api/sales/statistics
    elseif ($method === 'GET' && matchRoute('sales/statistics', $route)) {
        $currentUser = getAuthenticatedUser($pdo);
        $startDate = trim($_GET['startDate'] ?? '');
        $endDate = trim($_GET['endDate'] ?? '');

        $where = ["status = 'completed'"];
        $args = [];

        if ($startDate !== '') {
            $where[] = "saleDate >= ?";
            $args[] = date('Y-m-d H:i:s', strtotime($startDate));
        }
        if ($endDate !== '') {
            $where[] = "saleDate <= ?";
            $args[] = date('Y-m-d H:i:s', strtotime($endDate));
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        // 1. Overview counts
        $stmt = $pdo->prepare("SELECT COUNT(*) as totalSales, SUM(total) as totalRevenue, SUM(totalItems) as totalItems FROM sales $whereClause");
        $stmt->execute($args);
        $overview = $stmt->fetch();

        // 2. By payment method
        $stmt = $pdo->prepare("SELECT paymentMethod as _id, COUNT(*) as count, SUM(total) as total FROM sales $whereClause GROUP BY paymentMethod");
        $stmt->execute($args);
        $byPaymentMethod = [];
        while ($r = $stmt->fetch()) {
            $byPaymentMethod[] = [
                '_id' => $r['_id'],
                'count' => (int)$r['count'],
                'total' => (float)$r['total']
            ];
        }

        // 3. Daily sales trend (last 7 days)
        $weekAgo = date('Y-m-d H:i:s', strtotime('-7 days'));
        $stmt = $pdo->prepare("
            SELECT YEAR(saleDate) as yr, MONTH(saleDate) as mo, DAY(saleDate) as dy, COUNT(*) as totalSales, SUM(total) as totalRevenue 
            FROM sales 
            WHERE status = 'completed' AND saleDate >= ? 
            GROUP BY YEAR(saleDate), MONTH(saleDate), DAY(saleDate)
            ORDER BY yr ASC, mo ASC, dy ASC
        ");
        $stmt->execute([$weekAgo]);
        $dailySales = [];
        while ($r = $stmt->fetch()) {
            $dailySales[] = [
                '_id' => [
                    'year' => (int)$r['yr'],
                    'month' => (int)$r['mo'],
                    'day' => (int)$r['dy']
                ],
                'totalSales' => (int)$r['totalSales'],
                'totalRevenue' => (float)$r['totalRevenue']
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'overview' => [
                    'totalSales' => (int)($overview['totalSales'] ?? 0),
                    'totalRevenue' => (float)($overview['totalRevenue'] ?? 0),
                    'totalItems' => (int)($overview['totalItems'] ?? 0)
                ],
                'byPaymentMethod' => $byPaymentMethod,
                'dailySales' => $dailySales
            ]
        ]);
        exit();
    }

    // GET /api/sales/:id/receipt
    elseif ($method === 'GET' && matchRoute('sales/:id/receipt', $route, $params)) {
        $currentUser = getAuthenticatedUser($pdo);
        $id = $params[0];

        $stmt = $pdo->prepare("SELECT * FROM sales WHERE id = ?");
        $stmt->execute([$id]);
        $sale = $stmt->fetch();

        if (!$sale) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Sale not found']);
            exit();
        }

        // Fetch Items
        $items = [];
        $stmt = $pdo->prepare("SELECT * FROM sale_items WHERE sale_id = ?");
        $stmt->execute([$id]);
        while ($r = $stmt->fetch()) {
            $items[] = [
                'product' => [
                    'id' => $r['product_id'],
                    '_id' => (string)$r['product_id'],
                    'name' => $r['productName'],
                    'barcode' => $r['productBarcode']
                ],
                'productName' => $r['productName'],
                'productBarcode' => $r['productBarcode'],
                'quantity' => (int)$r['quantity'],
                'price' => (float)$r['price'],
                'subtotal' => (float)$r['subtotal']
            ];
        }

        // Fetch customer if present
        $customer = null;
        if ($sale['customer_id']) {
            $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
            $stmt->execute([$sale['customer_id']]);
            $c = $stmt->fetch();
            if ($c) {
                $customer = [
                    'id' => $c['id'],
                    '_id' => (string)$c['id'],
                    'name' => $c['name'],
                    'phone' => $c['phone'],
                    'email' => $c['email'],
                    'address' => [
                        'street' => $c['street'],
                        'city' => $c['city'],
                        'state' => $c['state'],
                        'zipCode' => $c['zipCode'],
                        'country' => $c['country']
                    ]
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'receipt' => [
                    'invoiceNumber' => $sale['invoiceNumber'],
                    'date' => $sale['saleDate'],
                    'customer' => $customer,
                    'customerName' => $sale['customerName'],
                    'staffName' => $sale['staffName'],
                    'items' => $items,
                    'subtotal' => (float)$sale['subtotal'],
                    'discount' => (float)$sale['discount'],
                    'discountPercent' => (float)$sale['discountPercent'],
                    'tax' => (float)$sale['tax'],
                    'taxRate' => (float)$sale['taxRate'],
                    'total' => (float)$sale['total'],
                    'amountPaid' => (float)$sale['amountPaid'],
                    'change' => (float)$sale['change'],
                    'paymentMethod' => $sale['paymentMethod'],
                    'paymentStatus' => $sale['paymentStatus']
                ]
            ]
        ]);
        exit();
    }

    // POST /api/sales
    elseif ($method === 'POST' && matchRoute('sales', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $items = $body['items'] ?? [];
        $customerId = $body['customer'] ?? null;
        $customerName = trim($body['customerName'] ?? 'Walk-in Customer');
        $paymentMethod = $body['paymentMethod'] ?? 'cash';
        $amountPaid = (float)($body['amountPaid'] ?? 0);
        $discountPercent = (float)($body['discountPercent'] ?? 0);
        $taxRate = (float)($body['taxRate'] ?? 0);
        $notes = trim($body['notes'] ?? '');

        if (empty($items)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'At least one item is required']);
            exit();
        }

        try {
            $pdo->beginTransaction();

            $processedItems = [];
            $subtotal = 0;
            $totalItemsCount = 0;

            foreach ($items as $item) {
                $pid = $item['product'] ?? '';
                $qty = (int)($item['quantity'] ?? 0);

                if ($qty < 1) {
                    throw new Exception("Invalid quantity for product ID: $pid");
                }

                $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? FOR UPDATE");
                $stmt->execute([$pid]);
                $product = $stmt->fetch();

                if (!$product) {
                    throw new Exception("Product not found: $pid");
                }

                if ($product['quantity'] < $qty) {
                    throw new Exception("Insufficient stock for {$product['name']}. Available: {$product['quantity']}");
                }

                if ($product['stockStatus'] === 'out_of_stock') {
                    throw new Exception("Product {$product['name']} is out of stock");
                }

                $itemSubtotal = (float)$product['sellingPrice'] * $qty;
                $subtotal += $itemSubtotal;
                $totalItemsCount += $qty;

                $processedItems[] = [
                    'product_id' => $product['id'],
                    'name' => $product['name'],
                    'barcode' => $product['barcode'],
                    'quantity' => $qty,
                    'price' => (float)$product['sellingPrice'],
                    'subtotal' => $itemSubtotal,
                    'buyingPrice' => (float)$product['buyingPrice']
                ];
            }

            // Generate invoice number INV-YYYYMMDD-XXXX
            $dateStr = date('Ymd');
            $stmt = $pdo->query("SELECT COUNT(*) FROM sales WHERE DATE(saleDate) = CURDATE()");
            $todayCount = $stmt->fetchColumn();
            $sequence = str_pad($todayCount + 1, 4, '0', STR_PAD_LEFT);
            $invoiceNumber = "INV-{$dateStr}-{$sequence}";

            // Calculate totals
            $discount = ($subtotal * $discountPercent) / 100;
            $afterDiscount = $subtotal - $discount;
            $tax = ($afterDiscount * $taxRate) / 100;
            $total = $afterDiscount + $tax;
            $change = $amountPaid - $total;

            // Fetch customer info
            $customerDbId = null;
            if (!empty($customerId)) {
                $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ? FOR UPDATE");
                $stmt->execute([$customerId]);
                $cDoc = $stmt->fetch();
                if ($cDoc) {
                    $customerDbId = $cDoc['id'];
                    $customerName = $cDoc['name'];
                }
            }

            // Insert Sale
            $stmt = $pdo->prepare("
                INSERT INTO sales (invoiceNumber, customer_id, customerName, staff_id, staffName, totalItems, subtotal, discount, discountPercent, tax, taxRate, total, paymentMethod, amountPaid, `change`, paymentStatus, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'completed', ?)
            ");
            $stmt->execute([
                $invoiceNumber, $customerDbId, $customerName, $currentUser['id'], $currentUser['name'],
                $totalItemsCount, $subtotal, $discount, $discountPercent, $tax, $taxRate, $total,
                $paymentMethod, $amountPaid, $change, $notes
            ]);
            $saleId = $pdo->lastInsertId();

            // Process Items stock subtraction & sale_items & inventory logs
            foreach ($processedItems as $item) {
                // Get current stock
                $stmt = $pdo->prepare("SELECT quantity, minStock FROM products WHERE id = ?");
                $stmt->execute([$item['product_id']]);
                $pMeta = $stmt->fetch();
                $prevQty = (int)$pMeta['quantity'];
                $newQty = $prevQty - $item['quantity'];
                $newStockStatus = getStockStatus($newQty, (int)$pMeta['minStock']);

                // Deduct stock
                $stmt = $pdo->prepare("UPDATE products SET quantity = ?, stockStatus = ? WHERE id = ?");
                $stmt->execute([$newQty, $newStockStatus, $item['product_id']]);

                // Insert sale_item record
                $stmt = $pdo->prepare("
                    INSERT INTO sale_items (sale_id, product_id, productName, productBarcode, quantity, price, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$saleId, $item['product_id'], $item['name'], $item['barcode'], $item['quantity'], $item['price'], $item['subtotal']]);

                // Insert inventory movement log
                $stmt = $pdo->prepare("
                    INSERT INTO inventory (product_id, productName, type, quantity, previousQuantity, newQuantity, referenceId, referenceType, user_id, userName, reason, costPerUnit, totalValue)
                    VALUES (?, ?, 'sale', ?, ?, ?, ?, 'sale', ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $item['product_id'], $item['name'], -$item['quantity'], $prevQty, $newQty,
                    $saleId, $currentUser['id'], $currentUser['name'], "Sale $invoiceNumber", $item['buyingPrice'], $item['buyingPrice'] * $item['quantity']
                ]);
            }

            // Customer Loyalty Points & purchase count updates
            if ($customerDbId) {
                $stmt = $pdo->prepare("SELECT totalSpent, totalPurchases, loyaltyPoints FROM customers WHERE id = ?");
                $stmt->execute([$customerDbId]);
                $cMeta = $stmt->fetch();

                $newSpent = (float)$cMeta['totalSpent'] + $total;
                $newPurchases = (int)$cMeta['totalPurchases'] + 1;
                $newPoints = (int)$cMeta['loyaltyPoints'] + floor($total / 100);

                // Recalculate tier
                $tier = 'bronze';
                if ($newSpent >= 100000) {
                    $tier = 'platinum';
                } elseif ($newSpent >= 50000) {
                    $tier = 'gold';
                } elseif ($newSpent >= 20000) {
                    $tier = 'silver';
                }

                $stmt = $pdo->prepare("UPDATE customers SET totalSpent = ?, totalPurchases = ?, loyaltyPoints = ?, membershipTier = ? WHERE id = ?");
                $stmt->execute([$newSpent, $newPurchases, $newPoints, $tier, $customerDbId]);
            }

            $pdo->commit();

            // Populate completed sale response
            $stmt = $pdo->prepare("SELECT * FROM sales WHERE id = ?");
            $stmt->execute([$saleId]);
            $saleData = $stmt->fetch();
            $saleData['id'] = $saleData['id'];
            $saleData['_id'] = (string)$saleData['id'];
            $saleData['total'] = (float)$saleData['total'];

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Sale completed successfully',
                'data' => ['sale' => $saleData]
            ]);
            exit();

        } catch (Exception $txEx) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $txEx->getMessage()]);
            exit();
        }
    }

    // GET /api/sales
    elseif ($method === 'GET' && matchRoute('sales', $route)) {
        $currentUser = getAuthenticatedUser($pdo);

        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 10);
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $paymentStatus = trim($_GET['paymentStatus'] ?? '');
        $paymentMethod = trim($_GET['paymentMethod'] ?? '');
        $startDate = trim($_GET['startDate'] ?? '');
        $endDate = trim($_GET['endDate'] ?? '');
        $sortBy = trim($_GET['sortBy'] ?? 'saleDate');
        $sortOrder = trim($_GET['sortOrder'] ?? 'desc');

        $where = [];
        $args = [];

        if ($search !== '') {
            $where[] = "(invoiceNumber LIKE ? OR customerName LIKE ?)";
            $args[] = "%$search%";
            $args[] = "%$search%";
        }
        if ($status !== '') {
            $where[] = "status = ?";
            $args[] = $status;
        }
        if ($paymentStatus !== '') {
            $where[] = "paymentStatus = ?";
            $args[] = $paymentStatus;
        }
        if ($paymentMethod !== '') {
            $where[] = "paymentMethod = ?";
            $args[] = $paymentMethod;
        }
        if ($startDate !== '') {
            $where[] = "saleDate >= ?";
            $args[] = date('Y-m-d H:i:s', strtotime($startDate));
        }
        if ($endDate !== '') {
            $where[] = "saleDate <= ?";
            $args[] = date('Y-m-d H:i:s', strtotime($endDate));
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $allowedSort = ['id' => 'id', 'invoiceNumber' => 'invoiceNumber', 'total' => 'total', 'saleDate' => 'saleDate'];
        $sortByCol = $allowedSort[$sortBy] ?? 'saleDate';
        $sortOrderDir = (strtolower($sortOrder) === 'asc') ? 'ASC' : 'DESC';

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM sales $whereClause");
        $stmt->execute($args);
        $total = $stmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $stmt = $pdo->prepare("
            SELECT s.*, c.name as cName, c.phone as cPhone, c.email as cEmail, u.name as uName, u.email as uEmail 
            FROM sales s 
            LEFT JOIN customers c ON s.customer_id = c.id 
            LEFT JOIN users u ON s.staff_id = u.id 
            $whereClause 
            ORDER BY $sortByCol $sortOrderDir 
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($args);

        $list = [];
        while ($r = $stmt->fetch()) {
            $list[] = [
                'id' => $r['id'],
                '_id' => (string)$r['id'],
                'invoiceNumber' => $r['invoiceNumber'],
                'customerName' => $r['customerName'],
                'totalItems' => (int)$r['totalItems'],
                'subtotal' => (float)$r['subtotal'],
                'discount' => (float)$r['discount'],
                'discountPercent' => (float)$r['discountPercent'],
                'tax' => (float)$r['tax'],
                'taxRate' => (float)$r['taxRate'],
                'total' => (float)$r['total'],
                'paymentMethod' => $r['paymentMethod'],
                'amountPaid' => (float)$r['amountPaid'],
                'change' => (float)$r['change'],
                'paymentStatus' => $r['paymentStatus'],
                'status' => $r['status'],
                'notes' => $r['notes'],
                'saleDate' => $r['saleDate'],
                'customer' => $r['customer_id'] ? [
                    'id' => $r['customer_id'],
                    '_id' => (string)$r['customer_id'],
                    'name' => $r['cName'],
                    'phone' => $r['cPhone'],
                    'email' => $r['cEmail']
                ] : null,
                'staff' => [
                    'id' => $r['staff_id'],
                    '_id' => (string)$r['staff_id'],
                    'name' => $r['uName'],
                    'email' => $r['uEmail']
                ]
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'sales' => $list,
                'pagination' => [
                    'total' => (int)$total,
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($total / $limit)
                ]
            ]
        ]);
        exit();
    }

    // If no endpoint matched
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Route not found',
        'path' => $route
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
