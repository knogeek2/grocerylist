<?php
header("Content-Type: application/json");

$seqFile = __DIR__ . "/../data/order-sequence.json";

if (!file_exists($seqFile)) {
    echo json_encode(["error" => "Sequence file missing"]);
    exit;
}

$data = json_decode(file_get_contents($seqFile), true);
$last = $data["lastOrderNumber"] ?? 0;

$next = $last + 1;
$data["lastOrderNumber"] = $next;

file_put_contents($seqFile, json_encode($data, JSON_PRETTY_PRINT));

echo json_encode([
    "success" => true,
    "nextOrderNumber" => $next
]);
