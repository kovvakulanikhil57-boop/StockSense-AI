-- ==============================================================================
-- StockSense AI: Analytical & Operational SQL Reports
-- ==============================================================================

USE stocksense_db;

-- ------------------------------------------------------------------------------
-- Report 1: Executive Store Summary & Key Performance Indicators
-- ------------------------------------------------------------------------------
SELECT 
    (SELECT COUNT(*) FROM Products WHERE is_active = TRUE) AS active_products_count,
    (SELECT COUNT(*) FROM Users WHERE role = 'STUDENT' AND is_verified = TRUE) AS verified_students_count,
    (SELECT COUNT(*) FROM Orders WHERE DATE(created_at) = CURDATE()) AS orders_today_count,
    (SELECT COUNT(*) FROM Orders WHERE order_status IN ('PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY')) AS active_pending_orders,
    (SELECT COUNT(*) FROM Orders WHERE order_status = 'DELIVERED') AS completed_orders_total,
    (SELECT COUNT(*) FROM Products WHERE is_active = TRUE AND stock_quantity <= reorder_level AND stock_quantity > 0) AS low_stock_items_count,
    (SELECT COUNT(*) FROM Products WHERE is_active = TRUE AND stock_quantity = 0) AS out_of_stock_items_count,
    (SELECT IFNULL(SUM(total_amount), 0.00) FROM Orders WHERE order_status = 'DELIVERED') AS total_completed_revenue;

-- ------------------------------------------------------------------------------
-- Report 2: Branch-wise Sales, Order Volume, and Average Order Value
-- ------------------------------------------------------------------------------
SELECT 
    b.branch_code,
    b.branch_name,
    b.department_block,
    COUNT(o.order_id) AS total_orders,
    SUM(CASE WHEN o.order_status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_orders,
    SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders,
    IFNULL(SUM(CASE WHEN o.order_status != 'CANCELLED' THEN o.total_amount ELSE 0 END), 0.00) AS gross_sales_value,
    IFNULL(AVG(CASE WHEN o.order_status != 'CANCELLED' THEN o.total_amount ELSE NULL END), 0.00) AS average_order_value
FROM Branches b
LEFT JOIN Orders o ON b.branch_id = o.branch_id
GROUP BY b.branch_id, b.branch_code, b.branch_name, b.department_block
ORDER BY gross_sales_value DESC;

-- ------------------------------------------------------------------------------
-- Report 3: Low Stock & Reorder Trigger Alert List
-- ------------------------------------------------------------------------------
SELECT 
    p.product_id,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    p.stock_quantity AS current_stock,
    p.reorder_level,
    (p.reorder_level - p.stock_quantity) AS deficit_quantity,
    p.price AS unit_selling_price,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'CRITICAL: OUT OF STOCK'
        WHEN p.stock_quantity <= p.reorder_level THEN 'WARNING: LOW STOCK'
        ELSE 'NORMAL'
    END AS inventory_health_status
FROM Products p
JOIN Categories c ON p.category_id = c.category_id
WHERE p.is_active = TRUE AND p.stock_quantity <= p.reorder_level
ORDER BY p.stock_quantity ASC, p.name ASC;

-- ------------------------------------------------------------------------------
-- Report 4: Best-Selling Products Ranking
-- ------------------------------------------------------------------------------
SELECT 
    p.product_id,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    IFNULL(SUM(oi.quantity), 0) AS units_sold,
    IFNULL(SUM(oi.line_total), 0.00) AS total_sales_revenue,
    p.stock_quantity AS remaining_stock
FROM Products p
JOIN Categories c ON p.category_id = c.category_id
LEFT JOIN Order_Items oi ON p.product_id = oi.product_id
LEFT JOIN Orders o ON oi.order_id = o.order_id AND o.order_status != 'CANCELLED'
GROUP BY p.product_id, p.sku, p.name, c.name, p.stock_quantity
ORDER BY units_sold DESC, total_sales_revenue DESC
LIMIT 10;

-- ------------------------------------------------------------------------------
-- Report 5: Delivery Agent Performance & SLA Duration Metrics
-- ------------------------------------------------------------------------------
SELECT 
    u.user_id AS agent_id,
    u.name AS agent_name,
    u.phone AS agent_phone,
    u.vehicle_number,
    b.branch_code,
    b.branch_name AS assigned_branch,
    COUNT(d.delivery_id) AS total_assignments,
    SUM(CASE WHEN d.assignment_status = 'DELIVERED' THEN 1 ELSE 0 END) AS successful_deliveries,
    SUM(CASE WHEN d.assignment_status = 'DECLINED' THEN 1 ELSE 0 END) AS declined_deliveries,
    SUM(CASE WHEN d.is_delayed = TRUE THEN 1 ELSE 0 END) AS delayed_deliveries_count,
    ROUND(AVG(CASE WHEN d.delivery_duration_minutes IS NOT NULL THEN d.delivery_duration_minutes ELSE NULL END), 1) AS avg_delivery_minutes,
    (SELECT COUNT(*) FROM Agent_Warnings aw WHERE aw.agent_id = u.user_id AND aw.status = 'ACTIVE') AS active_warnings_count
FROM Users u
JOIN Branches b ON u.branch_id = b.branch_id
LEFT JOIN Deliveries d ON u.user_id = d.agent_id
WHERE u.role = 'DELIVERY_AGENT'
GROUP BY u.user_id, u.name, u.phone, u.vehicle_number, b.branch_code, b.branch_name;

-- ------------------------------------------------------------------------------
-- Report 6: Stock Movements & Audit Trail for Inventory Reconciliation
-- ------------------------------------------------------------------------------
SELECT 
    st.transaction_id,
    st.created_at,
    p.sku,
    p.name AS product_name,
    st.transaction_type,
    st.quantity_change,
    st.previous_stock,
    st.new_stock,
    st.reference_type,
    st.reference_id,
    u.name AS actor_name,
    st.notes
FROM Stock_Transactions st
JOIN Products p ON st.product_id = p.product_id
LEFT JOIN Users u ON st.created_by = u.user_id
ORDER BY st.created_at DESC
LIMIT 50;
