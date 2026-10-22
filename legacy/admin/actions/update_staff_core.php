<?php
// admin/actions/update_staff_core.php
header('Content-Type: application/json');
require_once '../../config/db.php';
session_start();

// Security: Check if admin is logged in
// if (!isset($_SESSION['admin_id'])) {
//     echo json_encode(['success' => false, 'message' => 'Unauthorized']);
//     exit;
// }

$action = $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'delete':
            $staff_id = $_POST['staff_id'] ?? 0;
            
            try {
                $pdo->beginTransaction();

                // 1. Delete dependent records first (User Account)
                $stmtUser = $pdo->prepare("DELETE FROM user_account WHERE staff_id = ?");
                $stmtUser->execute([$staff_id]);

                // 2. Now delete the staff record
                $stmtStaff = $pdo->prepare("DELETE FROM staff WHERE staff_id = ?");
                $success = $stmtStaff->execute([$staff_id]);
                
                if ($success) {
                    $pdo->commit();
                    echo json_encode(['success' => true, 'message' => 'Staff and associated account deleted successfully']);
                } else {
                    $pdo->rollBack();
                    echo json_encode(['success' => false, 'message' => 'Failed to delete staff record']);
                }
            } catch (PDOException $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()]);
            }
            break;
        case 'update':
            // Logic for updating staff details
            $staff_id = $_POST['staff_id'];
            $first_name = $_POST['first_name'];
            $last_name = $_POST['last_name'];
            $email = $_POST['email'];
            $rank_id = $_POST['rank_id'];
            $dept_id = $_POST['department_id'];

            $sql = "UPDATE staff SET 
                    first_name = ?, last_name = ?, email = ?, 
                    rank_id = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE staff_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$first_name, $last_name, $email, $rank_id, $dept_id, $staff_id]);
            
            echo json_encode(['success' => true, 'message' => 'Staff updated successfully']);
            break;

        // case 'create':
        //     // This would handle the submission from your #createUserModal
        //     $staff_number = $_POST['staff_number'];
        //     $first_name = $_POST['first_name'];
        //     $last_name = $_POST['last_name'];
        //     $email = $_POST['email'];
        //     $rank_id = $_POST['rank_id'];
        //     $dept_id = $_POST['department_id'];

        //     $sql = "INSERT INTO staff (staff_number, first_name, last_name, email, rank_id, department_id) 
        //             VALUES (?, ?, ?, ?, ?, ?)";
            
        //     $stmt = $pdo->prepare($sql);
        //     $stmt->execute([$staff_number, $first_name, $last_name, $email, $rank_id, $dept_id]);
            
        //     echo json_encode(['success' => true, 'message' => 'New staff member added']);
        //     break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}