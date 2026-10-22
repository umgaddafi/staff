<?php
session_start();
if (isset($_SESSION['user_id']) && empty($_SESSION['force_reset'])) {
    if (($_SESSION['role'] ?? '') === 'Admin') {
        header('Location: ../admin/index.php?page=dashboard');
    } else {
        header('Location: ../staff/index.php?page=dashboard');
    }
    exit();
}

$msg = $_GET['msg'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - JOSTUM</title>
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
        .alert { margin-bottom:14px; padding:10px 12px; border-radius:10px; font-size:.84rem; border:1px solid #3f4c31; background:#182313; color:#d4efc4; }
        .alert.err { border-color:#5a2a2a; background:#2b1616; color:#ffc6c6; }
        .label { display:block; margin-bottom:8px; font-size:.84rem; color:#d5d8df; }
        .input { width:100%; border:1px solid var(--line); background:#141518; color:#fff; height:44px; border-radius:8px; padding:0 12px; font-family:inherit; }
        .input:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 2px rgba(200,163,107,.2); }
        .field { margin-bottom:14px; }
        .btn { width:100%; height:44px; border:0; border-radius:8px; background:#cda7df; color:#1f1028; font-weight:700; font-size:.95rem; cursor:pointer; font-family:inherit; }
        .back { margin-top:12px; text-align:center; }
        .back a { color:#d7d9df; font-size:.82rem; text-decoration:none; }
        .back a:hover { color:var(--brand); }
    </style>
</head>
<body>
<div class="screen">
    <main class="main">
        <div class="panel">
            <h1 class="title">Reset Password</h1>
            <p class="subtitle">Enter your registered staff email to receive a reset link.</p>
            <?php if ($msg === 'sent'): ?>
                <div class="alert">If your email exists in the system, a reset link has been sent.</div>
            <?php elseif ($msg === 'error'): ?>
                <div class="alert err">Unable to send reset email right now. Please try again.</div>
            <?php endif; ?>
            <form action="reset_password_process.php" method="POST">
                <div class="field">
                    <label class="label">Registered Staff Email</label>
                    <input type="email" name="email" class="input" required placeholder="Enter your staff email">
                </div>
                <button type="submit" class="btn"><?= $msg === 'sent' ? 'Resend Reset Link' : 'Send Reset Link' ?></button>
            </form>
            <div class="back"><a href="../login.php">Back to Login</a></div>
        </div>
    </main>
</div>
</body>
</html>
