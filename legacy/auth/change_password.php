<?php
session_start();
if (!isset($_SESSION['user_id']) || !isset($_SESSION['force_reset'])) {
    header("Location: ../login.php");
    exit();
}
require '../config/db.php';

$stmt = $pdo->prepare("SELECT username FROM user_account WHERE user_id = ? LIMIT 1");
$stmt->execute([$_SESSION['user_id']]);
$currentUsername = (string)($stmt->fetchColumn() ?: ($_SESSION['username'] ?? ''));
$error = $_GET['err'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Update - JOSTUM</title>
    <link rel="icon" type="image/jpeg" href="../images/jostum.jpeg">
    <link rel="stylesheet" href="../assets/css/fonts.css">
    <style>
        :root { --bg:#0f1012; --panel:#26272b; --text:#f4f4f5; --muted:#a0a3ab; --line:#3b3d44; --brand:#c8a36b; }
        * { box-sizing:border-box; }
        body { margin:0; min-height:100vh; background:#0d0e10; color:var(--text); font-family:'Ubuntu',sans-serif; }
        .screen { min-height:100vh; }
        .main { background:#111214; display:flex; align-items:center; justify-content:center; padding:28px; min-height:100vh; }
        .panel { width:100%; max-width:420px; }
        .title { text-align:center; margin:0; font-size:2rem; font-weight:700; }
        .subtitle { text-align:center; color:var(--muted); margin:8px 0 22px; font-size:.9rem; }
        .alert { margin-bottom:14px; padding:10px 12px; border-radius:10px; font-size:.84rem; border:1px solid #5a2a2a; background:#2b1616; color:#ffc6c6; }
        .label { display:block; margin-bottom:8px; font-size:.84rem; color:#d5d8df; }
        .input { width:100%; border:1px solid var(--line); background:#141518; color:#fff; height:44px; border-radius:8px; padding:0 12px; font-family:inherit; }
        .input:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 2px rgba(200,163,107,.2); }
        .field { margin-bottom:14px; }
        .btn { width:100%; height:44px; border:0; border-radius:8px; background:#cda7df; color:#1f1028; font-weight:700; font-size:.95rem; cursor:pointer; font-family:inherit; }
    </style>
</head>
<body>
<div class="screen">
    <main class="main">
        <div class="panel">
            <h1 class="title">Security Update</h1>
            <p class="subtitle">First login detected. Set a new password to continue.</p>

            <?php if ($error === 'mismatch'): ?>
                <div class="alert">Passwords do not match.</div>
            <?php elseif ($error === 'short'): ?>
                <div class="alert">Password must be at least 8 characters.</div>
            <?php elseif ($error === 'failed'): ?>
                <div class="alert">Password update failed. Please try again.</div>
            <?php endif; ?>
            
            <form action="update_password_process.php" method="POST">
                <div class="field">
                    <label class="label">Username</label>
                    <input type="text" class="input" value="<?= htmlspecialchars($currentUsername) ?>" readonly>
                </div>
                <div class="field">
                    <label class="label">New Password</label>
                    <input type="password" name="new_password" class="input" required minlength="8">
                </div>
                <div class="field">
                    <label class="label">Confirm New Password</label>
                    <input type="password" name="confirm_password" class="input" required minlength="8">
                </div>
                <button type="submit" class="btn">Update & Continue</button>
            </form>
        </div>
    </main>
</div>
</body>
</html>
