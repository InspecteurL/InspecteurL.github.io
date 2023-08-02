<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    // Save the profile data to a file or a database here
    // For simplicity, we'll just print it for now
    print_r($data);
}
?>
