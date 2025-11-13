<?php
$data = file_get_contents("php://input");
if ($data) {
    file_put_contents("json/brand.json", $data);
    echo "Brand data saved.";
} else {
    http_response_code(400);
    echo "No data received.";
}
?>
