<?php

$frontendDevUrl = 'http://localhost:5173';
$backendUrl = '/university-portfolio/backend/public';
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>University Portfolio Workspace</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: "Segoe UI", sans-serif;
            background: linear-gradient(180deg, #f8f6ef 0%, #eee7db 100%);
            color: #193436;
        }
        main {
            width: min(680px, calc(100% - 32px));
            padding: 32px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.86);
            box-shadow: 0 24px 60px rgba(25, 52, 54, 0.12);
        }
        h1 {
            margin-top: 0;
        }
        .links {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 20px;
        }
        a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 44px;
            padding: 0 18px;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 700;
        }
        .primary {
            color: #fff8ef;
            background: linear-gradient(135deg, #173b3a 0%, #2b5c59 70%, #b57f33 130%);
        }
        .secondary {
            color: #173b3a;
            border: 1px solid rgba(23, 59, 58, 0.18);
            background: #fff;
        }
        code {
            padding: 2px 8px;
            border-radius: 999px;
            background: rgba(23, 59, 58, 0.08);
        }
    </style>
</head>
<body>
    <main>
        <h1>University Portfolio Workspace</h1>
        <p>The project is now split into <code>frontend/</code> for React and <code>backend/</code> for Laravel.</p>
        <p>Run <code>npm run dev</code> inside <code>frontend/</code> for the React app, or open the backend API directly from the Laravel public directory.</p>
        <div class="links">
            <a class="primary" href="<?php echo htmlspecialchars($frontendDevUrl, ENT_QUOTES); ?>">Open Frontend Dev Server</a>
            <a class="secondary" href="<?php echo htmlspecialchars($backendUrl, ENT_QUOTES); ?>">Open Backend Public Root</a>
        </div>
    </main>
</body>
</html>
