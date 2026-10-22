<?php
// profile.php
// Redirect to the canonical public portfolio page so all assets/fonts/images resolve correctly.
$staffId = isset($_GET['staff_id']) ? (int)$_GET['staff_id'] : 0;
if ($staffId <= 0) {
    http_response_code(400);
    echo 'Error: No staff member specified.';
    exit();
}

header('Location: staff/view_portfolio.php?staff_id=' . urlencode((string)$staffId) . '&mode=public');
exit();
