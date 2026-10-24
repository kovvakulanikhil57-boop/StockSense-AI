-- ==============================================================================
-- StockSense AI: Supabase Data Verification Script
-- Run in Supabase SQL Editor to verify that all 16 tables are populated
-- ==============================================================================

-- 1. Table Row Counts (All 16 Tables)
SELECT 'branches' AS table_name, COUNT(*) AS row_count FROM branches
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_branches', COUNT(*) FROM product_branches
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL
SELECT 'purchase_items', COUNT(*) FROM purchase_items
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'agent_warnings', COUNT(*) FROM agent_warnings
UNION ALL
SELECT 'stock_transactions', COUNT(*) FROM stock_transactions
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'carts', COUNT(*) FROM carts
UNION ALL
SELECT 'cart_items', COUNT(*) FROM cart_items
ORDER BY table_name;

-- 2. Relational Consistency Checks
-- Check 2a: Orders linked to Deliveries and Delivery Agents
SELECT 
    o.order_number,
    o.order_status,
    u.name AS student_name,
    b.branch_code,
    d.assignment_status,
    ag.name AS agent_name,
    d.delivery_duration_minutes,
    d.is_delayed
FROM orders o
JOIN users u ON o.student_id = u.user_id
JOIN branches b ON o.branch_id = b.branch_id
LEFT JOIN deliveries d ON o.order_id = d.order_id
LEFT JOIN users ag ON d.agent_id = ag.user_id
ORDER BY o.order_id;

-- Check 2b: Purchases linked to Suppliers and Purchase Items count
SELECT 
    p.invoice_number,
    s.name AS supplier_name,
    p.purchase_date,
    p.total_cost,
    COUNT(pi.purchase_item_id) AS items_in_batch
FROM purchases p
JOIN suppliers s ON p.supplier_id = s.supplier_id
LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
GROUP BY p.purchase_id, p.invoice_number, s.name, p.purchase_date, p.total_cost;

-- Check 2c: Persistent Carts linked to Students and Cart Items
SELECT 
    c.cart_id,
    u.name AS student_name,
    u.email,
    COUNT(ci.cart_item_id) AS total_items_in_cart,
    COALESCE(SUM(ci.quantity * p.price), 0.00) AS cart_total_value
FROM carts c
JOIN users u ON c.student_id = u.user_id
LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.product_id
GROUP BY c.cart_id, u.name, u.email;

-- Check 2d: SLA Warnings issued to Agents
SELECT 
    aw.warning_id,
    ag.name AS penalized_agent,
    o.order_number,
    aw.reason,
    aw.status,
    admin.name AS issued_by_admin
FROM agent_warnings aw
JOIN users ag ON aw.agent_id = ag.user_id
JOIN users admin ON aw.issued_by = admin.user_id
LEFT JOIN orders o ON aw.order_id = o.order_id;
