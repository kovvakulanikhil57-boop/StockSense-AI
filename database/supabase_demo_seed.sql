-- ==============================================================================
-- StockSense AI: Complete Demonstration Seed Script (All 16 Tables)
-- Relationally consistent demonstration data for Supabase PostgreSQL
-- ==============================================================================
-- Idempotent: Uses ON CONFLICT DO UPDATE / DO NOTHING so it safely merges
-- without duplicating or corrupting any existing data.

-- ------------------------------------------------------------------------------
-- 1. Branches (3 Institutional Department Blocks)
-- ------------------------------------------------------------------------------
INSERT INTO branches (branch_id, branch_code, branch_name, department_block, is_active) VALUES
(1, '05', 'Computer Science and Engineering', 'CSE Block - Ground Floor', TRUE),
(2, '66', 'Artificial Intelligence and Machine Learning', 'CSM Block - 1st Floor', TRUE),
(3, '67', 'Data Science', 'CSD Block - 2nd Floor', TRUE)
ON CONFLICT (branch_id) DO UPDATE SET
    branch_code = EXCLUDED.branch_code,
    branch_name = EXCLUDED.branch_name,
    department_block = EXCLUDED.department_block,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 2. Categories (5 Academic Product Categories)
-- ------------------------------------------------------------------------------
INSERT INTO categories (category_id, name, description) VALUES
(1, 'Lab Records & Covers', 'Standard academic lab observation and record books with official university covers'),
(2, 'Paper & Notebooks', 'Reams of A4 sheets, lecture note registers, and spiral notebooks'),
(3, 'Writing Instruments', 'Micro gel pens, technical ballpoint pens, highlighters, and pencils'),
(4, 'Drafting & Drawing', 'Stencils, scales, engineering mini-drafter sheets, and geometry tools'),
(5, 'Tech & Computing Reference', 'Scientific calculators, quick reference desk pads, and computing accessories')
ON CONFLICT (category_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- 3. Users (7 Role-Based Academic Accounts)
-- Demo-only passwords: Demo-Admin-Only-2026!, Demo-Agent-Only-2026!, Demo-Student-Only-2026!
-- ------------------------------------------------------------------------------
INSERT INTO users (user_id, name, email, password_hash, role, branch_id, phone, vehicle_number, is_verified, is_active) VALUES
-- 1 Store Admin
(1, 'Demo Store Administrator', 'admin@example.test', '$2a$10$Alecsmo/aVSR6syaxSxhKeTxF0J7VwhUegnmHAe1Va9tNpznTgCcq', 'ADMIN', NULL, NULL, NULL, TRUE, TRUE),

-- 3 Designated Delivery Agents
(2, 'Demo CSE Agent', 'demo.agent05@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 1, NULL, 'DEMO-0005', TRUE, TRUE),
(3, 'Demo CSM Agent', 'demo.agent66@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 2, NULL, 'DEMO-0066', TRUE, TRUE),
(4, 'Demo CSD Agent', 'demo.agent67@example.test', '$2a$10$Rhy5pz.JXugF2Df7wYmvyehsy7zETpKUFvzk2jrPJnmf/dBYH0dpK', 'DELIVERY_AGENT', 3, NULL, 'DEMO-0067', TRUE, TRUE),

-- 3 Verified Students (Regular & Lateral Entry)
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

-- ------------------------------------------------------------------------------
-- 4. Suppliers (3 Academic Vendors)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. Products (19 Stationery Items, Image-Free Architecture)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. Product_Branches (Dynamic Branch Catalog Configuration)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. Purchases (Admin Inflow Procurement Batches)
-- ------------------------------------------------------------------------------
INSERT INTO purchases (purchase_id, supplier_id, invoice_number, purchase_date, total_cost, notes, created_by) VALUES
(1, 1, 'INV-2026-001', '2026-10-01', 14200.00, 'Initial semester bulk procurement of university lab records and covers', 1),
(2, 2, 'INV-2026-002', '2026-10-02', 18975.00, 'Stocking bond paper, note registers, and branch-specific computing manuals', 1)
ON CONFLICT (purchase_id) DO UPDATE SET
    supplier_id = EXCLUDED.supplier_id,
    invoice_number = EXCLUDED.invoice_number,
    purchase_date = EXCLUDED.purchase_date,
    total_cost = EXCLUDED.total_cost,
    notes = EXCLUDED.notes,
    created_by = EXCLUDED.created_by;

-- ------------------------------------------------------------------------------
-- 8. Purchase_Items (Line Items for Each Purchase Inflow)
-- ------------------------------------------------------------------------------
INSERT INTO purchase_items (purchase_item_id, purchase_id, product_id, quantity, cost_price, line_total) VALUES
-- Purchase 1 Line Items (Total: 14200.00)
(1, 1, 1, 50, 70.00, 3500.00),
(2, 1, 2, 120, 15.00, 1800.00),
(3, 1, 9, 40, 80.00, 3200.00),
(4, 1, 12, 35, 90.00, 3150.00),
(5, 1, 15, 30, 85.00, 2550.00),
-- Purchase 2 Line Items (Total: 18975.00)
(6, 2, 3, 35, 220.00, 7700.00),
(7, 2, 4, 70, 60.00, 4200.00),
(8, 2, 5, 55, 65.00, 3575.00),
(9, 2, 6, 100, 35.00, 3500.00)
ON CONFLICT (purchase_item_id) DO UPDATE SET
    purchase_id = EXCLUDED.purchase_id,
    product_id = EXCLUDED.product_id,
    quantity = EXCLUDED.quantity,
    cost_price = EXCLUDED.cost_price,
    line_total = EXCLUDED.line_total;

-- ------------------------------------------------------------------------------
-- 9. Orders (3 Real-World Lifecycle Demonstration Orders)
-- Order 1: Completed & Delivered (with SLA delay)
-- Order 2: Active / Out for Delivery (with Cryptographic OTP)
-- Order 3: Pending Order (Awaiting Delivery Assignment)
-- ------------------------------------------------------------------------------
INSERT INTO orders (order_id, order_number, student_id, branch_id, delivery_location, order_status, payment_status, payment_method, total_amount, cancellation_reason, is_stock_restored, created_at) VALUES
(1, 'ORD-20261015-001', 5, 1, 'CSE Block - Room 104 (Lab 2)', 'DELIVERED', 'PAID', 'CASH_ON_DELIVERY', 230.00, NULL, FALSE, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(2, 'ORD-20261015-002', 6, 2, 'CSM Block - 1st Floor AIML Seminar Hall', 'OUT_FOR_DELIVERY', 'PENDING', 'CASH_ON_DELIVERY', 210.00, NULL, FALSE, CURRENT_TIMESTAMP - INTERVAL '40 minutes'),
(3, 'ORD-20261015-003', 7, 3, 'CSD Block - Ground Floor Data Lab', 'PENDING', 'PAID', 'SIMULATED_ONLINE', 200.00, NULL, FALSE, CURRENT_TIMESTAMP - INTERVAL '15 minutes')
ON CONFLICT (order_id) DO UPDATE SET
    order_number = EXCLUDED.order_number,
    student_id = EXCLUDED.student_id,
    branch_id = EXCLUDED.branch_id,
    delivery_location = EXCLUDED.delivery_location,
    order_status = EXCLUDED.order_status,
    payment_status = EXCLUDED.payment_status,
    payment_method = EXCLUDED.payment_method,
    total_amount = EXCLUDED.total_amount,
    is_stock_restored = EXCLUDED.is_stock_restored;

-- ------------------------------------------------------------------------------
-- 10. Order_Items (Detailed Line Items for Each Demonstration Order)
-- ------------------------------------------------------------------------------
INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, line_total) VALUES
-- Order 1 Items (Sum = 95 + 110 + 25 = 230.00)
(1, 1, 1, 1, 95.00, 95.00),
(2, 1, 9, 1, 110.00, 110.00),
(3, 1, 2, 1, 25.00, 25.00),
-- Order 2 Items (Sum = 125 + 85 = 210.00)
(4, 2, 12, 1, 125.00, 125.00),
(5, 2, 4, 1, 85.00, 85.00),
-- Order 3 Items (Sum = 120 + 80 = 200.00)
(6, 3, 15, 1, 120.00, 120.00),
(7, 3, 17, 1, 80.00, 80.00)
ON CONFLICT (order_item_id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    product_id = EXCLUDED.product_id,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    line_total = EXCLUDED.line_total;

-- ------------------------------------------------------------------------------
-- 11. Deliveries (Delivery Lifecycle & Agent Linkage)
-- Delivery 1: DELIVERED by Agent 2 (40 mins duration -> SLA Breach)
-- Delivery 2: DISPATCHED by Agent 3 (Active OTP challenge)
-- Delivery 3: ASSIGNED to Agent 4 (Pending dispatch)
-- ------------------------------------------------------------------------------
INSERT INTO deliveries (
    delivery_id, order_id, agent_id, assignment_status,
    accepted_at, dispatched_at, delivered_at,
    otp_hash, otp_expires_at, failed_attempt_count,
    delivery_duration_minutes, is_delayed
) VALUES
(
    1, 1, 2, 'DELIVERED',
    CURRENT_TIMESTAMP - INTERVAL '110 minutes',
    CURRENT_TIMESTAMP - INTERVAL '90 minutes',
    CURRENT_TIMESTAMP - INTERVAL '70 minutes',
    NULL, NULL, 0,
    40, TRUE
),
(
    2, 2, 3, 'DISPATCHED',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    NULL,
    '$2a$10$FIbOmJzmjTmCF.DcAjXaGeB/7U5Y3rLBlxV/MxdroE2Ir8w/KjBl2',
    CURRENT_TIMESTAMP + INTERVAL '15 minutes',
    0,
    NULL, FALSE
),
(
    3, 3, 4, 'ASSIGNED',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    NULL, NULL,
    NULL, NULL, 0,
    NULL, FALSE
)
ON CONFLICT (delivery_id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    agent_id = EXCLUDED.agent_id,
    assignment_status = EXCLUDED.assignment_status,
    accepted_at = EXCLUDED.accepted_at,
    dispatched_at = EXCLUDED.dispatched_at,
    delivered_at = EXCLUDED.delivered_at,
    otp_hash = EXCLUDED.otp_hash,
    otp_expires_at = EXCLUDED.otp_expires_at,
    failed_attempt_count = EXCLUDED.failed_attempt_count,
    delivery_duration_minutes = EXCLUDED.delivery_duration_minutes,
    is_delayed = EXCLUDED.is_delayed;

-- ------------------------------------------------------------------------------
-- 12. Agent_Warnings (Formal SLA Discipline Warning)
-- Connected to Delivery 1 for exceeding the institutional 30-minute threshold
-- ------------------------------------------------------------------------------
INSERT INTO agent_warnings (warning_id, agent_id, order_id, delivery_id, issued_by, reason, status, created_at) VALUES
(
    1, 2, 1, 1, 1,
    'SLA Breach: Delivery duration exceeded institutional 30-minute SLA threshold (took 40 minutes for Order #ORD-20261015-001 to CSE Block Room 104).',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '60 minutes'
)
ON CONFLICT (warning_id) DO UPDATE SET
    agent_id = EXCLUDED.agent_id,
    order_id = EXCLUDED.order_id,
    delivery_id = EXCLUDED.delivery_id,
    issued_by = EXCLUDED.issued_by,
    reason = EXCLUDED.reason,
    status = EXCLUDED.status;

-- ------------------------------------------------------------------------------
-- 13. Stock_Transactions (Complete Inventory Movement Audit Log)
-- Shows both supplier batch inflows (PURCHASE) and order checkout deductions (SALE)
-- ------------------------------------------------------------------------------
INSERT INTO stock_transactions (transaction_id, product_id, transaction_type, quantity_change, previous_stock, new_stock, reference_type, reference_id, notes, created_by) VALUES
-- Procurement Inflows
(1, 1, 'PURCHASE', 50, 0, 50, 'PURCHASE', 1, 'Initial supplier batch from Demo Supplier A', 1),
(2, 2, 'PURCHASE', 120, 0, 120, 'PURCHASE', 1, 'Initial supplier batch from Demo Supplier A', 1),
(3, 9, 'PURCHASE', 40, 0, 40, 'PURCHASE', 1, 'Initial CSE Lab record stock', 1),
(4, 12, 'PURCHASE', 35, 0, 35, 'PURCHASE', 1, 'Initial CSM Lab record stock', 1),
(5, 15, 'PURCHASE', 30, 0, 30, 'PURCHASE', 1, 'Initial CSD Lab record stock', 1),
(6, 3, 'PURCHASE', 35, 0, 35, 'PURCHASE', 2, 'Paper stock from Demo Supplier B', 1),
-- Order 1 Deductions (Sale)
(7, 1, 'SALE', -1, 49, 48, 'ORDER', 1, 'Order placement #ORD-20261015-001', 5),
(8, 9, 'SALE', -1, 39, 38, 'ORDER', 1, 'Order placement #ORD-20261015-001', 5),
(9, 2, 'SALE', -1, 111, 110, 'ORDER', 1, 'Order placement #ORD-20261015-001', 5)
ON CONFLICT (transaction_id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    transaction_type = EXCLUDED.transaction_type,
    quantity_change = EXCLUDED.quantity_change,
    previous_stock = EXCLUDED.previous_stock,
    new_stock = EXCLUDED.new_stock,
    reference_type = EXCLUDED.reference_type,
    reference_id = EXCLUDED.reference_id,
    notes = EXCLUDED.notes,
    created_by = EXCLUDED.created_by;

-- ------------------------------------------------------------------------------
-- 14. Notifications (Cross-Role System Notifications)
-- ------------------------------------------------------------------------------
INSERT INTO notifications (notification_id, user_id, title, message, type, is_read, link) VALUES
(1, 1, 'Store Operations Initialized', 'StockSense AI store operational across CSE, CSM, and CSD branches.', 'SYSTEM', TRUE, '/admin'),
(2, 2, 'SLA Warning Issued', 'A delivery duration warning (40 mins) was logged for Order #ORD-20261015-001.', 'WARNING', FALSE, '/agent/orders'),
(3, 3, 'Active Order Dispatched', 'Order #ORD-20261015-002 dispatched for CSM Block. Delivery OTP verification active.', 'ORDER', FALSE, '/agent/orders'),
(4, 6, 'Order Out For Delivery', 'Your stationery order #ORD-20261015-002 is on the way to CSM Seminar Hall.', 'DELIVERY', FALSE, '/student/orders')
ON CONFLICT (notification_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    type = EXCLUDED.type,
    is_read = EXCLUDED.is_read,
    link = EXCLUDED.link;

-- ------------------------------------------------------------------------------
-- 15. Carts (Isolated Student Persistent Carts)
-- ------------------------------------------------------------------------------
INSERT INTO carts (cart_id, student_id) VALUES
(1, 5), -- Demo CSE student
(2, 7)  -- Demo CSD student
ON CONFLICT (cart_id) DO UPDATE SET
    student_id = EXCLUDED.student_id;

-- ------------------------------------------------------------------------------
-- 16. Cart_Items (Products Saved in Student Carts)
-- ------------------------------------------------------------------------------
INSERT INTO cart_items (cart_item_id, cart_id, product_id, quantity) VALUES
(1, 1, 3, 2), -- Cart 1 has 2x Bond Paper Ream
(2, 1, 6, 1), -- Cart 1 has 1x Micro Gel Pen
(3, 2, 16, 1) -- Cart 2 has 1x Big Data Spark Manual
ON CONFLICT (cart_item_id) DO UPDATE SET
    cart_id = EXCLUDED.cart_id,
    product_id = EXCLUDED.product_id,
    quantity = EXCLUDED.quantity;

-- ------------------------------------------------------------------------------
-- 17. Synchronize Identity Sequences
-- Ensures next auto-increment insert in PostgreSQL allocates MAX(id) + 1
-- ------------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('branches', 'branch_id'), COALESCE((SELECT MAX(branch_id) FROM branches), 1));
SELECT setval(pg_get_serial_sequence('categories', 'category_id'), COALESCE((SELECT MAX(category_id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('suppliers', 'supplier_id'), COALESCE((SELECT MAX(supplier_id) FROM suppliers), 1));
SELECT setval(pg_get_serial_sequence('products', 'product_id'), COALESCE((SELECT MAX(product_id) FROM products), 1));
SELECT setval(pg_get_serial_sequence('purchases', 'purchase_id'), COALESCE((SELECT MAX(purchase_id) FROM purchases), 1));
SELECT setval(pg_get_serial_sequence('purchase_items', 'purchase_item_id'), COALESCE((SELECT MAX(purchase_item_id) FROM purchase_items), 1));
SELECT setval(pg_get_serial_sequence('orders', 'order_id'), COALESCE((SELECT MAX(order_id) FROM orders), 1));
SELECT setval(pg_get_serial_sequence('order_items', 'order_item_id'), COALESCE((SELECT MAX(order_item_id) FROM order_items), 1));
SELECT setval(pg_get_serial_sequence('deliveries', 'delivery_id'), COALESCE((SELECT MAX(delivery_id) FROM deliveries), 1));
SELECT setval(pg_get_serial_sequence('agent_warnings', 'warning_id'), COALESCE((SELECT MAX(warning_id) FROM agent_warnings), 1));
SELECT setval(pg_get_serial_sequence('stock_transactions', 'transaction_id'), COALESCE((SELECT MAX(transaction_id) FROM stock_transactions), 1));
SELECT setval(pg_get_serial_sequence('notifications', 'notification_id'), COALESCE((SELECT MAX(notification_id) FROM notifications), 1));
SELECT setval(pg_get_serial_sequence('carts', 'cart_id'), COALESCE((SELECT MAX(cart_id) FROM carts), 1));
SELECT setval(pg_get_serial_sequence('cart_items', 'cart_item_id'), COALESCE((SELECT MAX(cart_item_id) FROM cart_items), 1));
