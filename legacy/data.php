<?php
// Rank weights for sorting logic (Lower number = Higher Rank)
$rank_hierarchy = [
    'Dean' => 1,
    'Professor' => 2,
    'Associate Professor' => 3,
    'Senior Lecturer' => 4,
    'Lecturer' => 5,
    'Assistant Lecturer' => 6
];

$staff_data = [
    [
        'id' => 101,
        'name' => 'Dr. Eleanor Vance',
        'role' => 'Dean',
        'faculty' => 'Science',
        'department' => 'Physics',
        'img' => 'https://i.pravatar.cc/150?u=101', // Placeholder images
        'link' => '#'
    ],
    [
        'id' => 102,
        'name' => 'Prof. Arthur Hill',
        'role' => 'Professor',
        'faculty' => 'Arts',
        'department' => 'History',
        'img' => 'https://i.pravatar.cc/150?u=102',
        'link' => '#'
    ],
    [
        'id' => 103,
        'name' => 'Sarah Oconnell',
        'role' => 'Lecturer',
        'faculty' => 'Science',
        'department' => 'Mathematics',
        'img' => 'https://i.pravatar.cc/150?u=103',
        'link' => '#'
    ],
    [
        'id' => 104,
        'name' => 'Dr. James Chen',
        'role' => 'Associate Professor',
        'faculty' => 'Engineering',
        'department' => 'Computer Science',
        'img' => 'https://i.pravatar.cc/150?u=104',
        'link' => '#'
    ],
    [
        'id' => 105,
        'name' => 'Prof. Mary Sterling',
        'role' => 'Professor',
        'faculty' => 'Science',
        'department' => 'Physics',
        'img' => 'https://i.pravatar.cc/150?u=105',
        'link' => '#'
    ],
     [
        'id' => 106,
        'name' => 'John Doe',
        'role' => 'Assistant Lecturer',
        'faculty' => 'Engineering',
        'department' => 'Civil Engineering',
        'img' => 'https://i.pravatar.cc/150?u=106',
        'link' => '#'
    ],
];

// Helper to get unique lists for dropdowns
$faculties = array_unique(array_column($staff_data, 'faculty'));
$departments = array_unique(array_column($staff_data, 'department'));
?>