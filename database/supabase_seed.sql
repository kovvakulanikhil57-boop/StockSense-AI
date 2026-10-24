-- ==============================================================================
-- StockSense AI: University Stationery Store and Delivery Management System
-- PostgreSQL Seed Data for Supabase
-- ==============================================================================

-- 1. Seed Branches
INSERT INTO branches (branch_id, branch_code, branch_name, department_block, is_active) VALUES
(1, '05', 'Computer Science and Engineering', 'CSE Block - Ground Floor', TRUE),
(2, '66', 'Artificial Intelligence and Machine Learning', 'CSM Block - 1st Floor', TRUE),
(3, '67', 'Data Science', 'CSD Block - 2nd Floor', TRUE)
ON CONFLICT (branch_id) DO UPDATE SET
    branch_code = EXCLUDED.branch_code,
    branch_name = EXCLUDED.branch_name,
    department_block = EXCLUDED.department_block,
    is_active = EXCLUDED.is_active;

-- 2. Seed Users
-- Demo-only passwords: Demo-Admin-Only-2026!, Demo-Agent-Only-2026!, Demo-Student-Only-2026!

INSERT INTO users (user_id, name, email, password_hash, role, branch_id, phone, vehicle_number, is_verified, is_active) VALUES
-- Admin
(1, 'Demo Store Administrator', 'admin@example.test', '$2a$10$Alecsmo/aVSR6syaxSxhKeTxF0J7VwhUegnmHAe1Va9tNpznTgCcq', 'ADMIN', NULL, NULL, NULL, TRUE, TRUE),

-- Branch Delivery Agents (One designated agent per branch)
(2, 'Demo CSE Agent', 'demo.agent05@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 1, NULL, 'DEMO-0005', TRUE, TRUE),
(3, 'Demo CSM Agent', 'demo.agent66@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 2, NULL, 'DEMO-0066', TRUE, TRUE),
(4, 'Demo CSD Agent', 'demo.agent67@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 3, NULL, 'DEMO-0067', TRUE, TRUE),

-- Students (One for each branch, including regular and lateral entries)
(5, 'Demo CSE Student', '99071A0501@example.test', '$2a$10$5DnPppgghGM8EgAkjy3Mg.Iq6WTCoDaBZyBwenwZEoHDo7v3ptuX.', 'STUDENT', 1, NULL, NULL, TRUE, TRUE),
(6, 'Demo CSM Student', '99071A6605@example.test', '$2a$10$5DnPppgghGM8EgAkjy3Mg.Iq6WTCoDaBZyBwenwZEoHDo7v3ptuX.', 'STUDENT', 2, NULL, NULL, TRUE, TRUE),
(7, 'Demo CSD Student', '99075A6709@example.test', '$2a$10$5DnPppgghGM8EgAkjy3Mg.Iq6WTCoDaBZyBwenwZEoHDo7v3ptuX.', 'STUDENT', 3, NULL, NULL, TRUE, TRUE)
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id,
    phone = EXCLUDED.phone,
    vehicle_number = EXCLUDED.vehicle_number,
    is_verified = EXCLUDED.is_verified,
    is_active = EXCLUDED.is_active;

-- 3. Seed Categories
INSERT INTO categories (category_id, name, description) VALUES
(1, 'Lab Records & Covers', 'Standard academic lab observation and record books with official university covers'),
(2, 'Paper & Notebooks', 'Reams of A4 sheets, lecture note registers, and spiral notebooks'),
(3, 'Writing Instruments', 'Micro gel pens, technical ballpoint pens, highlighters, and pencils'),
(4, 'Drafting & Drawing', 'Stencils, scales, engineering mini-drafter sheets, and geometry tools'),
(5, 'Tech & Computing Reference', 'Scientific calculators, quick reference desk pads, and computing accessories')
ON CONFLICT (category_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 4. Seed Suppliers
INSERT INTO suppliers (supplier_id, name, contact_person, email, phone, address, is_active) VALUES
(1, 'Demo Supplier A', 'Demo Contact A', 'supplier-a@example.test', NULL, 'Demo supplier address A', TRUE),
(2, 'Demo Supplier B', 'Demo Contact B', 'supplier-b@example.test', NULL, 'Demo supplier address B', TRUE),
(3, 'Demo Supplier C', 'Demo Contact C', 'supplier-c@example.test', NULL, 'Demo supplier address C', TRUE)
ON CONFLICT (supplier_id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    is_active = EXCLUDED.is_active;

-- 5. Seed Products (Image-free academic catalogue)
INSERT INTO products (product_id, sku, name, description, category_id, price, stock_quantity, reorder_level, is_active, image_url) VALUES
-- Common Products (Available to all branches)
(1, 'GEN-REC-160', 'Hardcover Lab Record Book (160 Pages)', 'Official university 160-page hardbound record with alternate ruled and graph/blank pages for engineering lab practicals.', 1, 95.00, 48, 10, TRUE, NULL),
(2, 'GEN-COV-BLU', 'University Blue Record Cover with Crest', 'Thick laminated royal-blue protective cover embossed with the university logo and student detail fields.', 1, 25.00, 110, 20, TRUE, NULL),
(3, 'GEN-PPR-A4', 'Premium A4 Bond Paper Ream (500 Sheets, 75 GSM)', 'High-brightness smudge-free A4 paper ream ideal for lab code printouts, seminar reports, and project thesis.', 2, 290.00, 32, 8, TRUE, NULL),
(4, 'GEN-NTB-200', 'Spiral Bound Engineering Notebook (200 Pages)', 'Durable polypropylene cover spiral lecture notebook with micro-perforated bleed-resistant pages.', 2, 85.00, 65, 15, TRUE, NULL),
(5, 'GEN-PEN-10PK', 'Executive Ballpoint Pens (5 Blue + 5 Black)', 'Smooth flow 0.7mm tungsten-carbide tip ballpoint pens for rapid lab observation writing and exams.', 3, 90.00, 50, 12, TRUE, NULL),
(6, 'GEN-PEN-GEL', 'Waterproof Micro Gel Pen (0.5mm Black)', 'Fade-proof archival pigment ink gel pen recommended for final record submissions and diagrams.', 3, 35.00, 75, 15, TRUE, NULL),
(7, 'GEN-DRW-STN', 'Engineering Flowchart & Logic Gate Stencil', 'Flexible acrylic drawing template with standard electronic logic gates, flowchart diamonds, and arrows.', 4, 60.00, 28, 5, TRUE, NULL),
(8, 'GEN-CAL-991', 'fx-991CW ClassWiz Scientific Calculator', '540+ functions, high-resolution 4-gradation display, spreadsheet capability, matrix and vector calculations.', 5, 1250.00, 14, 4, TRUE, NULL),

-- CSE Specific Products (Branch 1: 05)
(9, 'CSE-LAB-OS', 'CSE Operating Systems & Algorithms Observation Book', 'Pre-printed algorithm trace sheets, process scheduling diagrams, and UNIX system call observation templates.', 1, 110.00, 38, 10, TRUE, NULL),
(10, 'CSE-LAB-CD', 'CSE Compiler Design & Networks Lab Manual', 'Grammar parse tables, lexical analyzer transition state grids, and Cisco packet trace sheets.', 1, 120.00, 35, 10, TRUE, NULL),
(11, 'CSE-REF-LNX', 'Linux CLI & Data Structures Desk Reference Card', 'Laminated double-sided cheat sheet covering bash shortcuts, GDB commands, asymptotic bounds, and STL maps.', 5, 75.00, 22, 5, TRUE, NULL),

-- CSM / AIML Specific Products (Branch 2: 66)
(12, 'CSM-LAB-ML', 'AIML Machine Learning Practical Record', 'Specialized record book containing hyperparameter tuning matrices, epoch loss logs, and confusion matrix grids.', 1, 125.00, 34, 8, TRUE, NULL),
(13, 'CSM-LAB-DL', 'Deep Learning & Neural Networks Practical Manual', 'Pre-formatted layers diagramming paper, backprop gradient calculation worksheets, and PyTorch syntax templates.', 1, 130.00, 28, 8, TRUE, NULL),
(14, 'CSM-REF-AI', 'NumPy, Pandas & PyTorch AI Architecture Cheat Sheet', 'Durable non-slip desk mat featuring tensor manipulation idioms, CNN/Transformer layer reference, and activation curves.', 5, 85.00, 19, 5, TRUE, NULL),

-- CSD / Data Science Specific Products (Branch 3: 67)
(15, 'CSD-LAB-STAT', 'CSD Statistical Computing & R Practical Record', 'Specialized observation record with hypothesis test workflows, ANOVA summary tables, and R ggplot2 logs.', 1, 120.00, 30, 8, TRUE, NULL),
(16, 'CSD-LAB-BD', 'Big Data Analytics & Spark Practical Lab Manual', 'HDFS cluster topology diagrams, MapReduce trace sheets, and Apache Spark DataFrame transformation logs.', 1, 135.00, 25, 8, TRUE, NULL),
(17, 'CSD-REF-SQL', 'SQL Window Functions & Tableau Visualization Guide', 'Compact accordion reference card with recursive CTEs, indexing strategies, and data warehouse schema patterns.', 5, 80.00, 24, 5, TRUE, NULL),

-- Out of Stock & Low Stock Showcase Products
(18, 'GEN-STY-01', 'Rechargeable Digital Stylus for Tablet Drawing', 'Fine point capacitive stylus pen with palm rejection for tablet note taking and schematics (Currently out of stock).', 5, 450.00, 0, 5, TRUE, NULL),
(19, 'GEN-MINI-DRF', 'Compact Engineering Mini-Drafter (Stainless Steel)', 'Drafting arm tool with 360-degree protractor head for engineering graphics labs.', 4, 380.00, 3, 5, TRUE, NULL)
ON CONFLICT (product_id) DO UPDATE SET
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    price = EXCLUDED.price,
    stock_quantity = EXCLUDED.stock_quantity,
    reorder_level = EXCLUDED.reorder_level,
    is_active = EXCLUDED.is_active;

-- 6. Seed Product_Branches
-- Common products (1-8, 18, 19) visible to all three branches (1, 2, 3)
INSERT INTO product_branches (product_id, branch_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2), (2, 3),
(3, 1), (3, 2), (3, 3),
(4, 1), (4, 2), (4, 3),
(5, 1), (5, 2), (5, 3),
(6, 1), (6, 2), (6, 3),
(7, 1), (7, 2), (7, 3),
(8, 1), (8, 2), (8, 3),
(18, 1), (18, 2), (18, 3),
(19, 1), (19, 2), (19, 3),
-- CSE Exclusive (9, 10, 11) -> Branch 1 (05)
(9, 1), (10, 1), (11, 1),
-- CSM / AIML Exclusive (12, 13, 14) -> Branch 2 (66)
(12, 2), (13, 2), (14, 2),
-- CSD / Data Science Exclusive (15, 16, 17) -> Branch 3 (67)
(15, 3), (16, 3), (17, 3)
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- 7. Synchronize Identity Sequences
-- Ensures that next auto-increment insert gets max(id) + 1
SELECT setval(pg_get_serial_sequence('branches', 'branch_id'), COALESCE((SELECT MAX(branch_id) FROM branches), 1));
SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('categories', 'category_id'), COALESCE((SELECT MAX(category_id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('suppliers', 'supplier_id'), COALESCE((SELECT MAX(supplier_id) FROM suppliers), 1));
SELECT setval(pg_get_serial_sequence('products', 'product_id'), COALESCE((SELECT MAX(product_id) FROM products), 1));
