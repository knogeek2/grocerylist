<?php

file_put_contents(__DIR__ . "/php_is_running.txt", "YES");

// =======================================================
// DEBUG LOGGING (ALWAYS VISIBLE IN FILEZILLA)
// =======================================================

// This writes to: /public_html/grocerylist/php/debug.log
// You WILL see this file in FileZilla.
$debugFile = __DIR__ . "/debug.log";

function dbg($msg) {
    global $debugFile;
    $timestamp = date("Y-m-d H:i:s");
    error_log("[$timestamp] $msg\n", 3, $debugFile);
}

dbg("=== saveOrder.php invoked ===");


// =======================================================
// READ RAW INPUT
// =======================================================

$input = file_get_contents("php://input");
dbg("Raw input: " . $input);


// =======================================================
// DECODE JSON
// =======================================================

$order = json_decode($input, true);

if (!$order) {
    dbg("ERROR: JSON decode failed");
    echo json_encode(["status" => "error", "message" => "Invalid JSON"]);
    exit;
}

dbg("Decoded orderNumber: " . $order["orderNumber"]);


// =======================================================
// PREPARE FILE PATH
// =======================================================

$filename = __DIR__ . "/../data/order.json";
dbg("Target file: " . $filename);


// =======================================================
// LOAD EXISTING DATA
// =======================================================

$existing = [];

if (file_exists($filename)) {
    $json = file_get_contents($filename);
    dbg("Existing file contents length: " . strlen($json));

    $existing = json_decode($json, true);

    if (!is_array($existing)) {
        dbg("WARNING: existing file was not valid JSON, resetting to empty array");
        $existing = [];
    }
} else {
    dbg("No existing file found — creating new one");
}


// =======================================================
// UPDATE OR APPEND ORDER
// =======================================================

$found = false;

foreach ($existing as &$row) {
    if ($row["orderNumber"] === $order["orderNumber"]) {
        dbg("Updating existing order: " . $order["orderNumber"]);
        $row = $order;
        $found = true;
        break;
    }
}

if (!$found) {
    dbg("Appending new order: " . $order["orderNumber"]);
    $existing[] = $order;
}


// =======================================================
// WRITE FILE
// =======================================================

$encoded = json_encode($existing, JSON_PRETTY_PRINT);

if (file_put_contents($filename, $encoded) === false) {
    dbg("ERROR: Failed to write file");
    echo json_encode(["status" => "error", "message" => "File write failed"]);
    exit;
}

dbg("SUCCESS: File written");


// =======================================================
// SEND RESPONSE
// =======================================================

$response = ["status" => "ok", "orderNumber" => $order["orderNumber"]];
dbg("Response sent: " . json_encode($response));

echo json_encode($response);

?>
