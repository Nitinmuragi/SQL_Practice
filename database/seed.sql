-- SQL Practice Platform Seed Data
USE sql_practice;

-- Insert demo user if not exists
-- Insert demo student and dedicated admin users
INSERT INTO users (id, full_name, email, password_hash, is_admin)
VALUES 
(
    1,
    'Demo Student',
    'demo@example.com',
    'scrypt:32768:8:1$6knAHjR5ReLiAuyb$80151917b51b7c1988fca63f7a21b2f6c456e4e1d81a7b66b5dc37fa1a4e8085167721f33d7284b88a2a797b7a9c74e0a57f0644af43fa3af9edb14eb8a48c64',
    FALSE
),
(
    2,
    'System Administrator',
    'admin@example.com',
    'scrypt:32768:8:1$nsGuFXTlB9SRZd3J$a246b44d09ad78ce66008d6601bb9ddb63d6bf4d420b0891a70ea85647d454b791b6d47452f89ada9b5a6aca64aa663dd3d2741904b21a0ae12cd5e51ab6830e',
    TRUE
) ON DUPLICATE KEY UPDATE 
    full_name=VALUES(full_name),
    password_hash=VALUES(password_hash),
    is_admin=VALUES(is_admin);

-- Insert sample dataset
INSERT INTO datasets (id, user_id, name, source_type)
VALUES (1, 1, 'Student Records', 'manual')
ON DUPLICATE KEY UPDATE id=id;

-- Insert metadata for table
INSERT INTO dataset_tables (id, dataset_id, table_name, physical_table_name, row_count)
VALUES (1, 1, 'students', 'ds_1_students', 5)
ON DUPLICATE KEY UPDATE id=id;

-- Create physical table for dataset
CREATE TABLE IF NOT EXISTS ds_1_students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INT,
    course VARCHAR(255),
    marks INT,
    city VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample records
TRUNCATE TABLE ds_1_students;
INSERT INTO ds_1_students (id, name, age, course, marks, city) VALUES
(1, 'Rahul', 21, 'Computer Science', 87, 'Pune'),
(2, 'Priya', 22, 'AI', 92, 'Mumbai'),
(3, 'Amit', 20, 'Data Science', 76, 'Kolhapur'),
(4, 'Sneha', 21, 'Computer Science', 88, 'Pune'),
(5, 'Rohan', 23, 'AI', 69, 'Sangli');
