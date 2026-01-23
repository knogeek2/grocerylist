<?php
// save-list.php  —  this is the only PHP file you will ever need
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'POST only']));
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);

file_put_contents('current-list.json', json_encode($data, JSON_PRETTY_PRINT));

echo json_encode(['success' => true]);
?>