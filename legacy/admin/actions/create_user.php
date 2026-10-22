<?php
// actions/create_user.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
session_start();
require '../../config/db.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../../PhpMailer/src/Exception.php';
require '../../PhpMailer/src/PHPMailer.php';
require '../../PhpMailer/src/SMTP.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: ../index.php?page=staff");
    exit();
}

if (!isset($_SESSION['user_id']) || (($_SESSION['role'] ?? '') !== 'Admin')) {
    $_SESSION['msg'] = "Unauthorized action.";
    $_SESSION['msg_type'] = "danger";
    header("Location: ../index.php?page=staff");
    exit();
}

if (empty($_POST['first_name']) || empty($_POST['last_name']) || empty($_POST['email']) || empty($_POST['staff_number']) || empty($_POST['department_id']) || empty($_POST['rank_id'])) {
    $_SESSION['msg'] = "Please fill all required staff fields.";
    $_SESSION['msg_type'] = "danger";
    header("Location: ../index.php?page=staff");
    exit();
}
    
    $fName = trim($_POST['first_name']);
    $lName = trim($_POST['last_name']);
    $email = trim($_POST['email']);
    $staffNum = trim($_POST['staff_number']);
    $deptId = $_POST['department_id'];
    $rankId = $_POST['rank_id'];

    // 1. Check if Staff Email or Number already exists
    $check = $pdo->prepare("SELECT COUNT(*) FROM staff WHERE email = ? OR staff_number = ?");
    $check->execute([$email, $staffNum]);
    
    if ($check->fetchColumn() > 0) {
        $_SESSION['msg'] = "Error: A staff member with this Email or Staff Number already exists.";
        $_SESSION['msg_type'] = "danger";
        header("Location: ../index.php?page=staff");
        exit();
    }

    // 2. Generate UNIQUE Username (Handles duplicate names like John Doe)
    $cleanFName = preg_replace('/[^A-Za-z0-9]/', '', $fName);
    $cleanLName = preg_replace('/[^A-Za-z0-9]/', '', $lName);
    $baseUsername = strtolower($cleanFName . '.' . $cleanLName);
    $username = $baseUsername;
    $counter = 1;

    while (true) {
        $checkUser = $pdo->prepare("SELECT COUNT(*) FROM user_account WHERE username = ?");
        $checkUser->execute([$username]);
        if ($checkUser->fetchColumn() == 0) break;
        $username = $baseUsername . $counter++;
    }

    // 3. Generate Random Password
    $tempPassword = substr(str_shuffle('abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'), 0, 8);
    $hashedPassword = password_hash($tempPassword, PASSWORD_DEFAULT);

    try {
        $pdo->beginTransaction();

        // 4. Insert into staff table
        $sqlStaff = "INSERT INTO staff (staff_number, first_name, last_name, email, department_id, rank_id) 
                     VALUES (?, ?, ?, ?, ?, ?)";
        $stmtStaff = $pdo->prepare($sqlStaff);
        $stmtStaff->execute([$staffNum, $fName, $lName, $email, $deptId, $rankId]);
        $staffId = $pdo->lastInsertId();

        // 5. Insert into user_account table
        $sqlUser = "INSERT INTO user_account (staff_id, username, password, role, is_active, must_change_password) 
                    VALUES (?, ?, ?, 'Staff', 1, 1)";
        $stmtUser = $pdo->prepare($sqlUser);
        $stmtUser->execute([$staffId, $username, $hashedPassword]);

        // Commit DB first so staff creation always persists.
        $pdo->commit();

        // 6. Attempt to send email (non-blocking for DB persistence)
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'jostumpg@gmail.com';
        $mail->Password   = 'avajrmliqzokhbbi'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; 
        $mail->Port       = 587;

        $mail->setFrom('jostumpg@gmail.com', 'JOSTUM-PG');
        $mail->addAddress($email, "$fName $lName");

        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $baseUrl = $protocol . $_SERVER['HTTP_HOST'] . "/university-portfolio/login.php";

        $mail->isHTML(true);
        $mail->Subject = 'Access Your Academic Portfolio Account';
        $mail->Subject = 'Access Your Academic Portfolio Account';
        
        $mail->Body    = "
        <div style='font-family: Ubuntu, sans-serif; background-color: #f4f4f4; padding: 40px 10px; line-height: 1.6;'>
            <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);'>
                
                <div style='background-color: #1a5f7a; padding: 30px; text-align: center;'>
                    <h1 style='color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;'>JOSTUM-PG</h1>
                    <p style='color: #d1e8f0; margin: 5px 0 0; font-size: 14px;'>Academic Portfolio System</p>
                </div>

                <div style='padding: 40px 30px;'>
                    <h2 style='color: #333333; margin-top: 0;'>Welcome, $fName!</h2>
                    <p style='color: #555555;'>A new staff account has been provisioned for you. Use the credentials below to access your portal and begin managing your academic profile.</p>
                    
                    <div style='background-color: #f9f9f9; border-left: 4px solid #1a5f7a; padding: 20px; margin: 25px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #777;'>Login Credentials:</p>
                        <p style='margin: 10px 0; font-size: 16px;'><strong>Username:</strong> <span style='color: #1a5f7a;'>$username</span></p>
                        <p style='margin: 0; font-size: 16px;'><strong>Temp Password:</strong> <span style='color: #1a5f7a;'>$tempPassword</span></p>
                    </div>

                    <div style='text-align: center; margin-top: 30px;'>
                        <a href='$baseUrl'
                           style='background-color: #1a5f7a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>
                           Login to Staff Portal
                        </a>
                    </div>

                    <p style='color: #e63946; font-size: 13px; margin-top: 30px; font-style: italic;'>
                        * For security reasons, you will be prompted to change this temporary username and password immediately upon your first login.
                    </p>
                </div>

                <div style='background-color: #eeeeee; padding: 20px; text-align: center; font-size: 12px; color: #888888;'>
                    <p style='margin: 0;'>This is an automated system message. Please do not reply to this email.</p>
                    <p style='margin: 5px 0 0;'>&copy; " . date('Y') . " JOSTUM Postgraduate School. All rights reserved.</p>
                </div>
            </div>
        </div>
        ";

        $mail->send();
        $_SESSION['msg'] = "Account for <strong>$fName $lName</strong> created successfully and credentials emailed.";
        $_SESSION['msg_type'] = "success";

    } catch (Exception $e) {
        // PHPMailer exception after DB commit should not erase created staff.
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $_SESSION['msg'] = "Account created for <strong>$fName $lName</strong>, but email could not be sent. You can share credentials manually. Mail error: " . htmlspecialchars($e->getMessage());
        $_SESSION['msg_type'] = "warning";
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $_SESSION['msg'] = "Database Error: " . $e->getMessage();
        $_SESSION['msg_type'] = "danger";
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $_SESSION['msg'] = "Unexpected Error: " . $e->getMessage();
        $_SESSION['msg_type'] = "danger";
    }

    header("Location: ../index.php?page=staff");
    exit();
