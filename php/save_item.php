<?php
header("Content-Type: application/json");

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || !isset($data["upc"]) || !isset($data["itmname"])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data received or missing required fields"]);
    exit;
}

// Correct path to json/item.json (one level up from /php/)
$file = __DIR__ . "/../json/item.json";
$items = [];

if (file_exists($file)) {
    $items = json_decode(file_get_contents($file), true);
    if (!is_array($items)) {
        $items = [];
    }
}

$items[] = $data;

file_put_contents($file, json_encode($items, JSON_PRETTY_PRINT));

echo json_encode([
    "status" => "success",
    "sku" => $data["sku"]
]);
?>
