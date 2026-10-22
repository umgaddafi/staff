<?php 
// If already logged in, redirect
session_start();
require_once 'config/db.php';
if(isset($_SESSION['role'])) {
    if (!empty($_SESSION['user_id'])) {
        $mustStmt = $pdo->prepare("SELECT must_change_password FROM user_account WHERE user_id = ? LIMIT 1");
        $mustStmt->execute([$_SESSION['user_id']]);
        if ((int)$mustStmt->fetchColumn() === 1) {
            $_SESSION['force_reset'] = true;
            header("Location: auth/change_password.php");
            exit();
        }
    }
    if (!empty($_SESSION['force_reset'])) {
        header("Location: auth/change_password.php");
        exit();
    }
    if($_SESSION['role'] === 'Admin') header("Location: admin/index.php?page=dashboard");
    else header("Location: staff/index.php?page=dashboard");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Academic Portfolio</title>
    <link rel="icon" type="image/jpeg" href="images/jostum.jpeg">
    <link rel="stylesheet" href="assets/css/fonts.css">
    <style>
        :root { --bg: #0f1012; --panel: #26272b; --text: #f4f4f5; --muted: #a0a3ab; --line: #3b3d44; --brand: #c8a36b; }
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; background: #0d0e10; color: var(--text); font-family: 'Ubuntu', sans-serif; }
        .screen { min-height: 100vh; }
        .main { background: #111214; display: flex; align-items: center; justify-content: center; padding: 28px; min-height: 100vh; }
        .panel { width: 100%; max-width: 420px; }
        .icon { width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #d7d9de; font-size: 1.1rem; }
        .title { text-align: center; margin: 0; font-size: 2rem; font-weight: 700; }
        .subtitle { text-align: center; color: var(--muted); margin: 8px 0 22px; font-size: 0.9rem; }
        .alert { margin-bottom: 14px; padding: 10px 12px; border: 1px solid #5a2a2a; border-radius: 10px; background: #2b1616; color: #ffc6c6; font-size: 0.84rem; }
        .label { display: block; margin-bottom: 8px; font-size: 0.84rem; color: #d5d8df; }
        .input { width: 100%; border: 1px solid var(--line); background: #141518; color: #fff; height: 44px; border-radius: 8px; padding: 0 12px; font-family: inherit; }
        .input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 2px rgba(200,163,107,0.2); }
        .field { margin-bottom: 14px; }
        .meta { display: flex; justify-content: flex-end; margin-bottom: 14px; }
        .meta a { font-size: 0.78rem; color: #d7d9df; text-decoration: none; }
        .meta a:hover { color: var(--brand); }
        .btn { width: 100%; height: 44px; border: 0; border-radius: 8px; background: #cda7df; color: #1f1028; font-weight: 700; font-size: 0.95rem; cursor: pointer; font-family: inherit; }
        .btn:hover { filter: brightness(0.97); }
    </style>
</head>
<body>
<div class="screen">
    <main class="main">
        <div class="panel">
            <div class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 8.5L12 4l9.5 4.5L12 13 2.5 8.5Z" stroke="#d7d9de" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M6 10.2v4.1c0 .4.2.8.6 1 1.2.8 3.1 1.7 5.4 1.7s4.2-.9 5.4-1.7c.4-.2.6-.6.6-1v-4.1" stroke="#d7d9de" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M21.5 9v3.7" stroke="#d7d9de" stroke-width="1.6" stroke-linecap="round"/>
                    <circle cx="21.5" cy="13.7" r="1.1" fill="#d7d9de"/>
                </svg>
            </div>
            <h1 class="title">Login</h1>
            <p class="subtitle">Login into your account JOSTUM</p>

            <?php if(isset($_GET['err'])): ?>
                <div class="alert">
                    <?php 
                    if($_GET['err'] == 'invalid') echo "Invalid Username or Password"; 
                    if($_GET['err'] == 'inactive') echo "Account is deactivated"; 
                    ?>
                </div>
            <?php endif; ?>
            <?php if(($_GET['reset'] ?? '') === 'success'): ?>
                <div class="alert" style="border-color:#3f4c31;background:#182313;color:#d4efc4;">
                    Password reset successful. You can now login.
                </div>
            <?php endif; ?>

            <form action="login_core.php" method="POST">
                <div class="field">
                    <label class="label">Username</label>
                    <input type="text" name="username" class="input" required autocomplete="username" placeholder="Enter your username">
                </div>
                <div class="field">
                    <label class="label">Password</label>
                    <input type="password" name="password" class="input" required autocomplete="current-password" placeholder="Enter your password">
                </div>
                <div class="meta">
                    <a href="auth/reset_password.php">Reset Password</a>
                </div>
                <button type="submit" name="login_btn" class="btn">Login</button>
            </form>

        </div>
    </main>
</div>

</body>
</html>
