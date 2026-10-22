<?php
$password = '12345';

echo "Plain password: " . $password . "<br>";

$hash = password_hash($password, PASSWORD_DEFAULT);
echo "Hash: " . $hash;
