<?php
/**
 * Returns the next available numeric SKU for new items.
 * Mirrors the Access expression: newSKU = Max(SKU) + 1
 * with a floor of 100001 so the auto-assigned series always starts there.
 * Only pure numeric SKUs are considered (UPC last-6 or other codes that happen
 * to be numeric will raise the max, avoiding collisions).
 */
header('Content-Type: application/json');
header('Cache-Control: no-store');

try {
    $path = __DIR__ . '/../data/item.json';
    $items = [];
    if (file_exists($path)) {
        $raw = file_get_contents($path);
        $items = json_decode($raw, true) ?: [];
    }

    $max = 0;

    foreach ($items as $item) {
        $sku = isset($item['sku']) ? trim((string)$item['sku']) : '';
        // Pure numeric SKUs only (matches Access Max(SKU)+1 behaviour)
        if ($sku !== '' && ctype_digit($sku)) {
            $num = (int)$sku;
            if ($num > $max) {
                $max = $num;
            }
        }
    }

    // Never go below the starting point of the auto-assigned series
    $next = max($max + 1, 100001);

    echo json_encode([
        'nextSku' => $next,
        'source'  => 'item.json'
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'nextSku' => 100001,
        'error'   => $e->getMessage()
    ]);
}