<?php
header('Content-Type: text/plain; charset=utf-8');

$itemFile = __DIR__ . '/../data/item.json';
$orderFile = __DIR__ . '/../data/order.json';

if (!file_exists($itemFile) || !file_exists($orderFile)) {
    http_response_code(500);
    echo "Missing data files.\n";
    echo "Looked for:\n$itemFile\n$orderFile\n";
    exit;
}

// Load items
$items = json_decode(file_get_contents($itemFile), true);
if ($items === null) {
    http_response_code(500);
    echo "Failed to parse item.json\n";
    exit;
}

// Build SKU → shipWeight lookup
$weightLookup = [];
foreach ($items as $item) {
    $sku = trim((string)($item['sku'] ?? ''));
    if ($sku !== '' && isset($item['shipWeight'])) {
        $weightLookup[$sku] = $item['shipWeight'];
    }
}

echo "Loaded " . count($weightLookup) . " items with shipWeight from master.\n";

// Load orders
$orders = json_decode(file_get_contents($orderFile), true);
if ($orders === null) {
    http_response_code(500);
    echo "Failed to parse order.json\n";
    exit;
}

$updated = 0;

foreach ($orders as &$order) {
    if (!isset($order['items']) || !is_array($order['items'])) continue;

    foreach ($order['items'] as &$item) {
        $sku = trim((string)($item['sku'] ?? ''));
        $current = $item['shipWeight'] ?? null;

        // Only fill if missing / empty / zero
        if (($current === null || $current === '' || $current === 0) && isset($weightLookup[$sku])) {
            $item['shipWeight'] = $weightLookup[$sku];
            $updated++;
        }
    }
}
unset($order, $item); // break references

// Write back
$result = file_put_contents($orderFile, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    http_response_code(500);
    echo "Failed to write order.json\n";
    exit;
}

echo "Updated $updated item(s) with shipWeight.\n";
echo "order.json has been saved.\n";
echo "Done.\n";