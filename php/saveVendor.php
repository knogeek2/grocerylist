<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$input = file_get_contents('php://input');
$order = json_decode($input, true);

if (!$order || !isset($order['orderNumber'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid order data']);
    exit;
}

$filename = '../data/order.json';

error_log("=== Save attempt for order " . $order['orderNumber'] . " ===");

if (file_exists($filename)) {
    $jsonContent = file_get_contents($filename);
    $allOrders = json_decode($jsonContent, true) ?: [];
} else {
    $allOrders = [];
}

$found = false;
foreach ($allOrders as &$existing) {
    if ((string)$existing['orderNumber'] === (string)$order['orderNumber']) {
        $existing = $order;
        $found = true;
        break;
    }
}

if (!$found) {
    $allOrders[] = $order;
}

$encoded = json_encode($allOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

if (file_put_contents($filename, $encoded)) {
    echo json_encode(['status' => 'success', 'orderNumber' => $order['orderNumber']]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Write failed. Check path and permissions.']);
}
?>