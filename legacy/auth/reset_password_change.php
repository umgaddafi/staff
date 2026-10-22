<?php
session_start();
require '../config/db.php';
require_once '../includes/password_reset_helper.php';

ensurePasswordResetSchema($pdo);

$token = trim((string)($_GET['token'] ?? ''));
$msg = $_GET['msg'] ?? '';
$tokenData = [];
if ($token !== '') {
    $tokenData = resolvePasswordResetToken($pdo, $token);
}
$valid = !empty($tokenData);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Set New Password - JOSTUM</title>
    <link rel="icon" type="image/jpeg" href="../images/jostum.jpeg">
    <link rel="stylesheet" href="../assets/css/fonts.css">
    <style>
        :root { --bg:#0f1012; --panel:#26272b; --text:#f4f4f5; --muted:#a0a3ab; --line:#3b3d44; --brand:#c8a36b; }
        * { box-sizing:border-box; }
        body { margin:0; min-height:100vh; background:#0d0e10; color:var(--text); font-family:'Ubuntu',sans-serif; }
        .screen { min-height:100vh; display:grid; grid-template-columns:320px 1fr; }
        .side { background:linear-gradient(180deg,#292a2f 0%,#25262b 100%); border-right:1px solid rgba(255,255,255,.08); padding:36px 26px 24px; display:flex; flex-direction:column; }
        .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:1.08rem; }
        .bolt { width:20px; height:20px; border-radius:50%; background:rgba(255,255,255,.15); display:inline-flex; align-items:center; justify-content:center; font-size:.8rem; }
        .quote { margin-top:auto; font-size:.8rem; line-height:1.55; color:#c4c7ce; }
        .person { margin-top:18px; display:flex; align-items:center; gap:10px; }
        .avatar { width:56px; height:56px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,.15); background:#1f2024; }
        .person-name { margin:0; font-size:1rem; font-weight:700; color:#fff; }
        .person-role { margin:2px 0 0; font-size:.8rem; color:#b4b8c2; }
        .main { background:#111214; display:flex; align-items:center; justify-content:center; padding:28px; }
        .panel { width:100%; max-width:420px; }
        .title { text-align:center; margin:0; font-size:2rem; font-weight:700; }
        .subtitle { text-align:center; color:var(--muted); margin:8px 0 22px; font-size:.9rem; }
        .alert { margin-bottom:14px; padding:10px 12px; border-radius:10px; font-size:.84rem; border:1px solid #5a2a2a; background:#2b1616; color:#ffc6c6; }
        .label { display:block; margin-bottom:8px; font-size:.84rem; color:#d5d8df; }
        .input { width:100%; border:1px solid var(--line); background:#141518; color:#fff; height:44px; border-radius:8px; padding:0 12px; font-family:inherit; }
        .input:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 2px rgba(200,163,107,.2); }
        .field { margin-bottom:14px; }
        .btn { width:100%; height:44px; border:0; border-radius:8px; background:#cda7df; color:#1f1028; font-weight:700; font-size:.95rem; cursor:pointer; font-family:inherit; }
        .back { margin-top:12px; text-align:center; }
        .back a { color:#d7d9df; font-size:.82rem; text-decoration:none; }
        .back a:hover { color:var(--brand); }
        @media (max-width:900px){ .screen{grid-template-columns:1fr;} }
    </style>
</head>
<body>
<div class="screen">
    <aside class="side">
        <div class="brand"><span class="bolt">⚡</span><span>JOSTUM</span></div>
        <p class="quote">"Learning never exhausts the mind."</p>
        <div class="person">
            <img src="../images/jostum.jpeg" alt="JOSTUM Logo" class="avatar">
            <div><p class="person-name">ICT Directorate</p><p class="person-role">JOSTUM ICT</p></div>
        </div>
    </aside>
    <main class="main">
        <div class="panel">
            <h1 class="title">Set New Password</h1>
            <p class="subtitle">Create a new secure password for your account.</p>

            <?php if (!$valid): ?>
                <div class="alert">This reset link is invalid or expired. Request a new reset link.</div>
            <?php else: ?>
                <?php if ($msg === 'mismatch'): ?>
                    <div class="alert">Passwords do not match.</div>
                <?php endif; ?>
                <?php if ($msg === 'short'): ?>
                    <div class="alert">Password must be at least 8 characters.</div>
                <?php endif; ?>
                <form action="reset_password_update.php" method="POST">
                    <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">
                    <div class="field">
                        <label class="label">New Password</label>
                        <input type="password" name="new_password" class="input" minlength="8" required>
                    </div>
                    <div class="field">
                        <label class="label">Confirm New Password</label>
                        <input type="password" name="confirm_password" class="input" minlength="8" required>
                    </div>
                    <button type="submit" class="btn">Update Password</button>
                </form>
            <?php endif; ?>
            <div class="back"><a href="../login.php">Back to Login</a></div>
        </div>
    </main>
</div>
</body>
</html>
