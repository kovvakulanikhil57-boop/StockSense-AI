-- ==============================================================================
-- StockSense AI: Seed Data
-- ==============================================================================

USE stocksense_db;

-- Clear previous data in reverse foreign-key order for idempotency
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Notifications;
TRUNCATE TABLE Agent_Warnings;
TRUNCATE TABLE Deliveries;
TRUNCATE TABLE Order_Items;
TRUNCATE TABLE Orders;
TRUNCATE TABLE Purchase_Items;
TRUNCATE TABLE Purchases;
TRUNCATE TABLE Stock_Transactions;
TRUNCATE TABLE Product_Branches;
TRUNCATE TABLE Products;
TRUNCATE TABLE Suppliers;
TRUNCATE TABLE Categories;
TRUNCATE TABLE Users;
TRUNCATE TABLE Branches;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Seed Branches
INSERT INTO Branches (branch_id, branch_code, branch_name, department_block, is_active) VALUES
(1, '05', 'Computer Science and Engineering', 'CSE Block - Ground Floor', TRUE),
(2, '66', 'Artificial Intelligence and Machine Learning', 'CSM Block - 1st Floor', TRUE),
(3, '67', 'Data Science', 'CSD Block - 2nd Floor', TRUE);

-- 2. Seed Users
-- Demo-only passwords: Demo-Admin-Only-2026!, Demo-Agent-Only-2026!, Demo-Student-Only-2026!

INSERT INTO Users (user_id, name, email, password_hash, role, branch_id, phone, vehicle_number, is_verified, is_active) VALUES
-- Admin
(1, 'Demo Store Administrator', 'admin@example.test', '$2a$10$Alecsmo/aVSR6syaxSxhKeTxF0J7VwhUegnmHAe1Va9tNpznTgCcq', 'ADMIN', NULL, NULL, NULL, TRUE, TRUE),

-- Branch Delivery Agents (One designated agent per branch)
(2, 'Demo CSE Agent', 'demo.agent05@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 1, NULL, 'DEMO-0005', TRUE, TRUE),
(3, 'Demo CSM Agent', 'demo.agent66@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 2, NULL, 'DEMO-0066', TRUE, TRUE),
(4, 'Demo CSD Agent', 'demo.agent67@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 3, NULL, 'DEMO-0067', TRUE, TRUE),

-- Students (One for each branch, including regular and lateral entries)
(5, 'Demo CSE Student', '99071A0501@example.test', '$2a$10$5DnPppgghGM8EgAkjy3Mg.Iq6WTCoDaBZyBwenwZEoHDo7v3ptuX.', 'STUDENT', 1, NULL, NULL, TRUE, TRUE),
(6, 'Demo CSM Student', '99071A6605@example.test', '$2a$10$5DnPppgghGM8EgAkjy3Mg.Iq6WTCoDaBZyBwenwZEoHDo7v3ptuX.', 'STUDENT', 2, NULL, NULL, TRUE, TRUE),
(7, 'Demo CSD Student', '99075A6709@example.test', '$2a$10$5DnPppgghGM8EgAkjy3Mg.Iq6WTCoDaBZyBwenwZEoHDo7v3ptuX.', 'STUDENT', 3, NULL, NULL, TRUE, TRUE);

-- 3. Seed Categories
INSERT INTO Categories (category_id, name, description) VALUES
(1, 'Lab Records & Covers', 'Standard academic lab observation and record books with official university covers'),
(2, 'Paper & Notebooks', 'Reams of A4 sheets, lecture note registers, and spiral notebooks'),
(3, 'Writing Instruments', 'Micro gel pens, technical ballpoint pens, highlighters, and pencils'),
(4, 'Drafting & Drawing', 'Stencils, scales, engineering mini-drafter sheets, and geometry tools'),
(5, 'Tech & Computing Reference', 'Scientific calculators, quick reference desk pads, and computing accessories');

-- 4. Seed Suppliers
INSERT INTO Suppliers (supplier_id, name, contact_person, email, phone, address, is_active) VALUES
(1, 'Demo Supplier A', 'Demo Contact A', 'supplier-a@example.test', NULL, 'Demo supplier address A', TRUE),
(2, 'Demo Supplier B', 'Demo Contact B', 'supplier-b@example.test', NULL, 'Demo supplier address B', TRUE),
(3, 'Demo Supplier C', 'Demo Contact C', 'supplier-c@example.test', NULL, 'Demo supplier address C', TRUE);

-- 5. Seed Products
INSERT INTO Products (product_id, sku, name, description, category_id, price, stock_quantity, reorder_level, is_active, image_url) VALUES
-- Common Products (Available to all branches)
(1, 'GEN-REC-160', 'Hardcover Lab Record Book (160 Pages)', 'Official university 160-page hardbound record with alternate ruled and graph/blank pages for engineering lab practicals.', 1, 95.00, 48, 10, TRUE, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'),
(2, 'GEN-COV-BLU', 'University Blue Record Cover with Crest', 'Thick laminated royal-blue protective cover embossed with the university logo and student detail fields.', 1, 25.00, 110, 20, TRUE, 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80'),
(3, 'GEN-PPR-A4', 'Premium A4 Bond Paper Ream (500 Sheets, 75 GSM)', 'High-brightness smudge-free A4 paper ream ideal for lab code printouts, seminar reports, and project thesis.', 2, 290.00, 32, 8, TRUE, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80'),
(4, 'GEN-NTB-200', 'Spiral Bound Engineering Notebook (200 Pages)', 'Durable polypropylene cover spiral lecture notebook with micro-perforated bleed-resistant pages.', 2, 85.00, 65, 15, TRUE, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=600&q=80'),
(5, 'GEN-PEN-10PK', 'Executive Ballpoint Pens (5 Blue + 5 Black)', 'Smooth flow 0.7mm tungsten-carbide tip ballpoint pens for rapid lab observation writing and exams.', 3, 90.00, 50, 12, TRUE, 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80'),
(6, 'GEN-PEN-GEL', 'Waterproof Micro Gel Pen (0.5mm Black)', 'Fade-proof archival pigment ink gel pen recommended for final record submissions and diagrams.', 3, 35.00, 75, 15, TRUE, 'https://images.unsplash.com/photo-1585336261026-407421c97a8a?auto=format&fit=crop&w=600&q=80'),
(7, 'GEN-DRW-STN', 'Engineering Flowchart & Logic Gate Stencil', 'Flexible acrylic drawing template with standard electronic logic gates, flowchart diamonds, and arrows.', 4, 60.00, 28, 5, TRUE, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'),
(8, 'GEN-CAL-991', 'fx-991CW ClassWiz Scientific Calculator', '540+ functions, high-resolution 4-gradation display, spreadsheet capability, matrix and vector calculations.', 5, 1250.00, 14, 4, TRUE, 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=600&q=80'),

-- CSE Specific Products (Branch 1: 05)
(9, 'CSE-LAB-OS', 'CSE Operating Systems & Algorithms Observation Book', 'Pre-printed algorithm trace sheets, process scheduling diagrams, and UNIX system call observation templates.', 1, 110.00, 38, 10, TRUE, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80'),
(10, 'CSE-LAB-CD', 'CSE Compiler Design & Networks Lab Manual', 'Grammar parse tables, lexical analyzer transition state grids, and Cisco packet trace sheets.', 1, 120.00, 35, 10, TRUE, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80'),
(11, 'CSE-REF-LNX', 'Linux CLI & Data Structures Desk Reference Card', 'Laminated double-sided cheat sheet covering bash shortcuts, GDB commands, asymptotic bounds, and STL maps.', 5, 75.00, 22, 5, TRUE, 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=600&q=80'),

-- CSM / AIML Specific Products (Branch 2: 66)
(12, 'CSM-LAB-ML', 'AIML Machine Learning Practical Record', 'Specialized record book containing hyperparameter tuning matrices, epoch loss logs, and confusion matrix grids.', 1, 125.00, 34, 8, TRUE, 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80'),
(13, 'CSM-LAB-DL', 'Deep Learning & Neural Networks Practical Manual', 'Pre-formatted layers diagramming paper, backprop gradient calculation worksheets, and PyTorch syntax templates.', 1, 130.00, 28, 8, TRUE, 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=600&q=80'),
(14, 'CSM-REF-AI', 'NumPy, Pandas & PyTorch AI Architecture Cheat Sheet', 'Durable non-slip desk mat featuring tensor manipulation idioms, CNN/Transformer layer reference, and activation curves.', 5, 85.00, 19, 5, TRUE, 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=600&q=80'),

-- CSD / Data Science Specific Products (Branch 3: 67)
(15, 'CSD-LAB-STAT', 'CSD Statistical Computing & R Practical Record', 'Specialized observation record with hypothesis test workflows, ANOVA summary tables, and R ggplot2 logs.', 1, 120.00, 30, 8, TRUE, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80'),
(16, 'CSD-LAB-BD', 'Big Data Analytics & Spark Practical Lab Manual', 'HDFS cluster topology diagrams, MapReduce trace sheets, and Apache Spark DataFrame transformation logs.', 1, 135.00, 25, 8, TRUE, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'),
(17, 'CSD-REF-SQL', 'SQL Window Functions & Tableau Visualization Guide', 'Compact accordion reference card with recursive CTEs, indexing strategies, and data warehouse schema patterns.', 5, 80.00, 24, 5, TRUE, 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=600&q=80'),

-- Out of Stock & Low Stock Showcase Products
(18, 'GEN-STY-01', 'Rechargeable Digital Stylus for Tablet Drawing', 'Fine point capacitive stylus pen with palm rejection for tablet note taking and schematics (Currently out of stock).', 5, 450.00, 0, 5, TRUE, 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80'),
(19, 'GEN-MINI-DRF', 'Compact Engineering Mini-Drafter (Stainless Steel)', 'Drafting arm tool with 360-degree protractor head for engineering graphics labs.', 4, 380.00, 3, 5, TRUE, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80');

-- 6. Seed Product_Branches
-- Common products (1-8, 18, 19) visible to all three branches (1, 2, 3)
INSERT INTO Product_Branches (product_id, branch_id) VALUES
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

-- CSE specific products (9, 10, 11) visible only to CSE (branch 1)
(9, 1), (10, 1), (11, 1),

-- CSM specific products (12, 13, 14) visible only to CSM (branch 2)
(12, 2), (13, 2), (14, 2),

-- CSD specific products (15, 16, 17) visible only to CSD (branch 3)
(15, 3), (16, 3), (17, 3);

-- 7. Seed Purchases & Initial Stock Inflows
INSERT INTO Purchases (purchase_id, supplier_id, invoice_number, purchase_date, total_cost, notes, created_by) VALUES
(1, 1, 'INV-2026-001', '2026-10-01', 12450.00, 'Initial semester bulk procurement of university lab records and covers', 1),
(2, 2, 'INV-2026-002', '2026-10-02', 18900.00, 'Stocking bond paper, note registers, and branch-specific computing manuals', 1);

INSERT INTO Purchase_Items (purchase_item_id, purchase_id, product_id, quantity, cost_price, line_total) VALUES
(1, 1, 1, 50, 70.00, 3500.00),
(2, 1, 2, 120, 15.00, 1800.00),
(3, 1, 9, 40, 80.00, 3200.00),
(4, 1, 12, 35, 90.00, 3150.00),
(5, 1, 15, 30, 85.00, 2550.00),
(6, 2, 3, 35, 220.00, 7700.00),
(7, 2, 4, 70, 60.00, 4200.00),
(8, 2, 5, 55, 65.00, 3575.00);

-- Record in Stock_Transactions audit log
INSERT INTO Stock_Transactions (product_id, transaction_type, quantity_change, previous_stock, new_stock, reference_type, reference_id, notes, created_by) VALUES
(1, 'PURCHASE', 50, 0, 50, 'PURCHASE', 1, 'Initial supplier batch from Demo Supplier A', 1),
(2, 'PURCHASE', 120, 0, 120, 'PURCHASE', 1, 'Initial supplier batch from Demo Supplier A', 1),
(9, 'PURCHASE', 40, 0, 40, 'PURCHASE', 1, 'Initial CSE Lab record stock', 1),
(12, 'PURCHASE', 35, 0, 35, 'PURCHASE', 1, 'Initial CSM Lab record stock', 1),
(15, 'PURCHASE', 30, 0, 30, 'PURCHASE', 1, 'Initial CSD Lab record stock', 1),
(3, 'PURCHASE', 35, 0, 35, 'PURCHASE', 2, 'Paper stock from Demo Supplier B', 1);

-- 8. Seed Sample Seed Orders for Demonstration & Historical Analytics
-- Delivered Order (CSE Student)
INSERT INTO Orders (order_id, order_number, student_id, branch_id, delivery_location, order_status, payment_status, payment_method, total_amount, created_at) VALUES
(1, 'ORD-20261015-001', 5, 1, 'CSE Block - Room 104 (Lab 2)', 'DELIVERED', 'PAID', 'CASH_ON_DELIVERY', 215.00, DATE_SUB(NOW(), INTERVAL 45 MINUTE));

INSERT INTO Order_Items (order_item_id, order_id, product_id, quantity, unit_price, line_total) VALUES
(1, 1, 1, 1, 95.00, 95.00),
(2, 1, 9, 1, 110.00, 110.00),
(3, 1, 2, 1, 10.00, 10.00);

INSERT INTO Deliveries (delivery_id, order_id, agent_id, assignment_status, accepted_at, dispatched_at, delivered_at, delivery_duration_minutes, is_delayed) VALUES
(1, 1, 2, 'DELIVERED', DATE_SUB(NOW(), INTERVAL 40 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_SUB(NOW(), INTERVAL 15 MINUTE), 25, FALSE);

-- Pending Order (CSM Student)
INSERT INTO Orders (order_id, order_number, student_id, branch_id, delivery_location, order_status, payment_status, payment_method, total_amount, created_at) VALUES
(2, 'ORD-20261015-002', 6, 2, 'CSM Block - 1st Floor AIML Seminar Hall', 'PENDING', 'PENDING', 'CASH_ON_DELIVERY', 210.00, DATE_SUB(NOW(), INTERVAL 10 MINUTE));

INSERT INTO Order_Items (order_item_id, order_id, product_id, quantity, unit_price, line_total) VALUES
(4, 2, 12, 1, 125.00, 125.00),
(5, 2, 4, 1, 85.00, 85.00);

INSERT INTO Deliveries (delivery_id, order_id, agent_id, assignment_status) VALUES
(2, 2, 3, 'ASSIGNED');

-- Notifications
INSERT INTO Notifications (user_id, title, message, type, link) VALUES
(1, 'System Initialized', 'StockSense AI store operational for CSE, CSM, and CSD branches.', 'SYSTEM', '/admin'),
(3, 'New Order Assigned', 'New order ORD-20261015-002 assigned for CSM Block delivery.', 'ORDER', '/agent/orders');
