<?php
header("Content-Type: application/json");

// Path to your vendor.json file
$jsonFile = __DIR__ . "/json/vendor.json";

// Read incoming JSON
$input = file_get_contents("php://input");
if (!$input) {
    echo json_encode(["status" => "error", "message" => "No input received"]);
    exit;
}

$data = json_decode($input, true);
if ($data === null) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON"]);
    exit;
}

// Optional: validate structure (each vendor should have id + name at minimum)
foreach ($data as $vendor) {
    if (!isset($vendor["id"]) || !isset($vendor["name"])) {
        echo json_encode(["status" => "error", "message" => "Vendor missing required fields"]);
        exit;
    }
}

// Save back to vendor.json
if (file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT)) === false) {
    echo json_encode(["status" => "error", "message" => "Failed to write vendor.json"]);
    exit;
}

echo json_encode(["status" => "success", "message" => "Vendors saved"]);
?>
