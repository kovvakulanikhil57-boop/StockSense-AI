const { query, transaction, getGroupConcatSql } = require('../db/dbAdapter');

/**
 * Get comprehensive analytics and metrics for executive dashboard
 */
async function getDashboardMetrics(req, res) {
  try {
    // 1. KPI Aggregates
    const [counts] = await query(`
      SELECT 
        (SELECT COUNT(*) FROM Products WHERE is_active = TRUE) AS total_products,
        (SELECT COALESCE(SUM(stock_quantity), 0) FROM Products WHERE is_active = TRUE) AS total_stock_units,
        (SELECT COUNT(*) FROM Users WHERE role = 'STUDENT' AND is_verified = TRUE) AS total_students,
        (SELECT COUNT(*) FROM Orders WHERE DATE(created_at) = CURRENT_DATE) AS orders_today,
        (SELECT COUNT(*) FROM Orders WHERE order_status IN ('PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY')) AS pending_orders,
        (SELECT COUNT(*) FROM Orders WHERE order_status = 'DELIVERED') AS completed_orders,
        (SELECT COUNT(*) FROM Products WHERE is_active = TRUE AND stock_quantity <= reorder_level AND stock_quantity > 0) AS low_stock_count,
        (SELECT COUNT(*) FROM Products WHERE is_active = TRUE AND stock_quantity = 0) AS out_of_stock_count,
        (SELECT COUNT(*) FROM Users WHERE role = 'DELIVERY_AGENT' AND is_active = TRUE) AS active_delivery_agents,
        (SELECT COALESCE(SUM(total_amount), 0.00) FROM Orders WHERE order_status = 'DELIVERED') AS total_revenue,
        (SELECT COALESCE(AVG(delivery_duration_minutes), 0.0) FROM Deliveries WHERE assignment_status = 'DELIVERED') AS avg_delivery_minutes,
        (SELECT COUNT(*) FROM Deliveries WHERE is_delayed = TRUE) AS delayed_orders_count
    `);

    // 2. Branch-wise Orders & Sales Distribution
    const branchStats = await query(`
      SELECT b.branch_id, b.branch_code, b.branch_name,
             COUNT(o.order_id) AS order_count,
             COALESCE(SUM(CASE WHEN o.order_status = 'DELIVERED' THEN o.total_amount ELSE 0 END), 0.00) AS revenue
      FROM Branches b
      LEFT JOIN Orders o ON b.branch_id = o.branch_id
      GROUP BY b.branch_id, b.branch_code, b.branch_name
      ORDER BY b.branch_code ASC
    `);

    // 3. Top 5 Best Selling Products
    const bestSellers = await query(`
      SELECT p.product_id, p.name, p.sku, c.name AS category_name,
             COALESCE(SUM(oi.quantity), 0) AS units_sold,
             COALESCE(SUM(oi.line_total), 0.00) AS total_sales
      FROM Products p
      JOIN Categories c ON p.category_id = c.category_id
      JOIN Order_Items oi ON p.product_id = oi.product_id
      JOIN Orders o ON oi.order_id = o.order_id AND o.order_status = 'DELIVERED'
      GROUP BY p.product_id, p.name, p.sku, c.name
      ORDER BY units_sold DESC
      LIMIT 5
    `);

    // 4. Low Stock Alerts with Branch Codes
    const branchCodesAgg = getGroupConcatSql('b.branch_code', ', ', 'b.branch_code ASC', false);
    const lowStockItems = await query(`
      SELECT p.product_id, p.sku, p.name, p.stock_quantity, p.reorder_level, c.name AS category_name,
             COALESCE((
               SELECT ${branchCodesAgg}
               FROM Product_Branches pb
               JOIN Branches b ON pb.branch_id = b.branch_id
               WHERE pb.product_id = p.product_id
             ), 'All Branches') AS branch_codes
      FROM Products p
      JOIN Categories c ON p.category_id = c.category_id
      WHERE p.is_active = TRUE AND p.stock_quantity <= p.reorder_level
      ORDER BY p.stock_quantity ASC
      LIMIT 10
    `);

    // 5. Recent 8 Orders
    const recentOrders = await query(`
      SELECT o.order_id, o.order_number, o.total_amount, o.order_status, o.created_at,
             b.branch_code, stu.name AS student_name
      FROM Orders o
      JOIN Branches b ON o.branch_id = b.branch_id
      JOIN Users stu ON o.student_id = stu.user_id
      ORDER BY o.created_at DESC
      LIMIT 8
    `);

    return res.json({
      success: true,
      metrics: {
        totalProducts: counts.total_products,
        totalStockUnits: parseInt(counts.total_stock_units, 10) || 0,
        totalStudents: counts.total_students,
        ordersToday: counts.orders_today,
        pendingOrders: counts.pending_orders,
        completedOrders: counts.completed_orders,
        lowStockCount: counts.low_stock_count,
        outOfStockCount: counts.out_of_stock_count,
        activeDeliveryAgents: counts.active_delivery_agents || 0,
        totalRevenue: parseFloat(counts.total_revenue),
        avgDeliveryMinutes: Math.round(parseFloat(counts.avg_delivery_minutes) * 10) / 10,
        delayedOrdersCount: counts.delayed_orders_count
      },
      branchStats: branchStats.map(b => ({
        ...b,
        revenue: parseFloat(b.revenue)
      })),
      bestSellers: bestSellers.map(bs => ({
        ...bs,
        total_sales: parseFloat(bs.total_sales)
      })),
      lowStockItems,
      recentOrders: recentOrders.map(o => ({
        ...o,
        total_amount: parseFloat(o.total_amount)
      }))
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve metrics.' });
  }
}

/**
 * Create a new product with branch visibility links
 */
async function createProduct(req, res) {
  try {
    const {
      name,
      sku,
      description,
      categoryId,
      price,
      stockQuantity = 0,
      reorderLevel = 5,
      branchIds = [1, 2, 3],
      imageUrl
    } = req.body;

    if (!name || !sku || !categoryId || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name, SKU, category, and price are required.' });
    }

    const result = await transaction(async (connection) => {
      // Check SKU uniqueness
      const [existing] = await connection.execute('SELECT product_id FROM Products WHERE sku = ?', [sku.trim()]);
      if (existing.length > 0) {
        throw new Error(`A product with SKU '${sku.trim()}' already exists.`);
      }

      const [insert] = await connection.execute(
        `INSERT INTO Products 
         (name, sku, description, category_id, price, stock_quantity, reorder_level, is_active, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [
          name.trim(),
          sku.trim(),
          description ? description.trim() : null,
          parseInt(categoryId, 10),
          parseFloat(price),
          parseInt(stockQuantity, 10),
          parseInt(reorderLevel, 10),
          imageUrl ? imageUrl.trim() : null
        ]
      );

      const productId = insert.insertId;

      // Link branches
      for (const branchId of branchIds) {
        await connection.execute(
          'INSERT INTO Product_Branches (product_id, branch_id) VALUES (?, ?)',
          [productId, parseInt(branchId, 10)]
        );
      }

      // Record initial stock transaction if stock > 0
      if (parseInt(stockQuantity, 10) > 0) {
        await connection.execute(
          `INSERT INTO Stock_Transactions 
           (product_id, transaction_type, quantity_change, previous_stock, new_stock, reference_type, notes, created_by)
           VALUES (?, 'ADJUSTMENT', ?, 0, ?, 'MANUAL_ADJUSTMENT', 'Initial product catalog creation', ?)`,
          [productId, parseInt(stockQuantity, 10), parseInt(stockQuantity, 10), req.user.userId]
        );
      }

      return { productId, name, sku };
    });

    return res.status(201).json({ success: true, message: 'Product created successfully.', product: result });
  } catch (error) {
    console.error('Create product error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Update an existing product and its branch visibility
 */
async function updateProduct(req, res) {
  try {
    const productId = parseInt(req.params.id, 10);
    const {
      name,
      sku,
      description,
      categoryId,
      price,
      stockQuantity,
      reorderLevel,
      isActive,
      branchIds,
      imageUrl
    } = req.body;

    await transaction(async (connection) => {
      const [current] = await connection.execute(
        'SELECT product_id, stock_quantity FROM Products WHERE product_id = ? FOR UPDATE',
        [productId]
      );
      if (current.length === 0) {
        throw new Error('Product not found.');
      }

      const prevStock = current[0].stock_quantity;

      const updates = [];
      const params = [];

      if (name) { updates.push('name = ?'); params.push(name.trim()); }
      if (sku) { updates.push('sku = ?'); params.push(sku.trim()); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description ? description.trim() : null); }
      if (categoryId) { updates.push('category_id = ?'); params.push(parseInt(categoryId, 10)); }
      if (price !== undefined) { updates.push('price = ?'); params.push(parseFloat(price)); }
      if (reorderLevel !== undefined) { updates.push('reorder_level = ?'); params.push(parseInt(reorderLevel, 10)); }
      if (isActive !== undefined) { updates.push('is_active = ?'); params.push(Boolean(isActive)); }
      if (imageUrl !== undefined) { updates.push('image_url = ?'); params.push(imageUrl ? imageUrl.trim() : null); }

      if (stockQuantity !== undefined && parseInt(stockQuantity, 10) !== prevStock) {
        const newStock = parseInt(stockQuantity, 10);
        const change = newStock - prevStock;
        updates.push('stock_quantity = ?');
        params.push(newStock);

        // Record stock adjustment in audit log
        await connection.execute(
          `INSERT INTO Stock_Transactions 
           (product_id, transaction_type, quantity_change, previous_stock, new_stock, reference_type, notes, created_by)
           VALUES (?, 'ADJUSTMENT', ?, ?, ?, 'MANUAL_ADJUSTMENT', 'Admin inventory stock override', ?)`,
          [productId, change, prevStock, newStock, req.user.userId]
        );
      }

      if (updates.length > 0) {
        params.push(productId);
        await connection.execute(`UPDATE Products SET ${updates.join(', ')} WHERE product_id = ?`, params);
      }

      // Update branch links if provided
      if (branchIds && Array.isArray(branchIds)) {
        await connection.execute('DELETE FROM Product_Branches WHERE product_id = ?', [productId]);
        for (const branchId of branchIds) {
          await connection.execute(
            'INSERT INTO Product_Branches (product_id, branch_id) VALUES (?, ?)',
            [productId, parseInt(branchId, 10)]
          );
        }
      }
    });

    return res.json({ success: true, message: 'Product updated successfully.' });
  } catch (error) {
    console.error('Update product error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Delete / Deactivate a product
 */
async function toggleProductStatus(req, res) {
  try {
    const productId = parseInt(req.params.id, 10);
    const products = await query('SELECT is_active, name FROM Products WHERE product_id = ?', [productId]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const currentStatus = Boolean(products[0].is_active);
    const newStatus = !currentStatus;

    await query('UPDATE Products SET is_active = ? WHERE product_id = ?', [newStatus, productId]);

    return res.json({
      success: true,
      message: `Product '${products[0].name}' has been ${newStatus ? 'activated' : 'deactivated'}.`
    });
  } catch (error) {
    console.error('Toggle product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product status.' });
  }
}

/**
 * Record a purchase order from a supplier and atomically add stock
 */
async function recordPurchase(req, res) {
  try {
    const { supplierId, invoiceNumber, purchaseDate, items, notes } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and purchase items are required.' });
    }

    const result = await transaction(async (connection) => {
      let totalCost = 0;
      const verifiedItems = [];

      for (const item of items) {
        const prodId = parseInt(item.productId, 10);
        const qty = parseInt(item.quantity, 10);
        const cost = parseFloat(item.costPrice);

        if (isNaN(prodId) || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
          throw new Error('Each item must contain valid productId, positive quantity, and cost price.');
        }

        const [prod] = await connection.execute(
          'SELECT product_id, name, stock_quantity FROM Products WHERE product_id = ? FOR UPDATE',
          [prodId]
        );

        if (prod.length === 0) {
          throw new Error(`Product #${prodId} does not exist.`);
        }

        const lineTotal = cost * qty;
        totalCost += lineTotal;

        verifiedItems.push({
          productId: prodId,
          name: prod[0].name,
          quantity: qty,
          costPrice: cost,
          lineTotal,
          previousStock: prod[0].stock_quantity,
          newStock: prod[0].stock_quantity + qty
        });
      }

      // Insert Purchase Header
      const [purchaseInsert] = await connection.execute(
        `INSERT INTO Purchases (supplier_id, invoice_number, purchase_date, total_cost, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          parseInt(supplierId, 10),
          invoiceNumber ? invoiceNumber.trim() : null,
          purchaseDate || new Date().toISOString().split('T')[0],
          totalCost,
          notes ? notes.trim() : null,
          req.user.userId
        ]
      );

      const purchaseId = purchaseInsert.insertId;

      // Insert Purchase Items & Increase Stock
      for (const item of verifiedItems) {
        await connection.execute(
          `INSERT INTO Purchase_Items (purchase_id, product_id, quantity, cost_price, line_total)
           VALUES (?, ?, ?, ?, ?)`,
          [purchaseId, item.productId, item.quantity, item.costPrice, item.lineTotal]
        );

        // Add inventory
        await connection.execute(
          'UPDATE Products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
          [item.quantity, item.productId]
        );

        // Log Stock Transaction
        await connection.execute(
          `INSERT INTO Stock_Transactions 
           (product_id, transaction_type, quantity_change, previous_stock, new_stock, reference_type, reference_id, notes, created_by)
           VALUES (?, 'PURCHASE', ?, ?, ?, 'PURCHASE', ?, ?, ?)`,
          [
            item.productId,
            item.quantity,
            item.previousStock,
            item.newStock,
            purchaseId,
            `Stock received from invoice ${invoiceNumber || purchaseId}`,
            req.user.userId
          ]
        );
      }

      return { purchaseId, totalCost, itemsCount: verifiedItems.length };
    });

    return res.status(201).json({
      success: true,
      message: `Purchase order #${result.purchaseId} recorded and ${result.itemsCount} products restocked.`,
      result
    });
  } catch (error) {
    console.error('Record purchase error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Get all suppliers
 */
async function getSuppliers(req, res) {
  try {
    const suppliers = await query('SELECT * FROM Suppliers ORDER BY name ASC');
    return res.json({ success: true, suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve suppliers.' });
  }
}

/**
 * Create a new supplier
 */
async function createSupplier(req, res) {
  try {
    const { name, contactPerson, email, phone, address } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const result = await query(
      `INSERT INTO Suppliers (name, contact_person, email, phone, address, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [name.trim(), contactPerson || null, email || null, phone || null, address || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Supplier created successfully.',
      supplierId: result.insertId
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create supplier.' });
  }
}

/**
 * Get list of delayed orders for SLA review
 */
async function getDelayedDeliveries(req, res) {
  try {
    const orders = await query(`
      SELECT o.order_id, o.order_number, o.created_at, o.order_status,
             b.branch_code, b.branch_name,
             agent.user_id AS agent_id, agent.name AS agent_name, agent.phone AS agent_phone,
             d.delivery_id, d.accepted_at, d.delivered_at, d.delivery_duration_minutes, d.is_delayed,
             (SELECT COUNT(*) FROM Agent_Warnings aw WHERE aw.delivery_id = d.delivery_id) AS warnings_issued
      FROM Deliveries d
      JOIN Orders o ON d.order_id = o.order_id
      JOIN Branches b ON o.branch_id = b.branch_id
      LEFT JOIN Users agent ON d.agent_id = agent.user_id
      WHERE d.is_delayed = TRUE OR (d.delivery_duration_minutes > 30)
      ORDER BY d.delivery_duration_minutes DESC
    `);

    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get delayed deliveries error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve delayed deliveries.' });
  }
}

/**
 * Issue a formal disciplinary warning against a delivery agent after admin review
 */
async function issueAgentWarning(req, res) {
  try {
    const { agentId, orderId, deliveryId, reason } = req.body;

    if (!agentId || !reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Agent ID and warning reason are required.' });
    }

    const result = await query(
      `INSERT INTO Agent_Warnings (agent_id, order_id, delivery_id, issued_by, reason, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [parseInt(agentId, 10), orderId || null, deliveryId || null, req.user.userId, reason.trim()]
    );

    // Notify agent of formal warning
    await query(
      `INSERT INTO Notifications (user_id, title, message, type, link)
       VALUES (?, 'Official Notice: Delivery Warning Issued', ?, 'WARNING', '/agent/warnings')`,
      [agentId, `An administrative warning was recorded: "${reason.trim()}"`]
    );

    return res.status(201).json({
      success: true,
      message: 'Agent warning recorded and notification sent to the delivery agent.',
      warningId: result.insertId
    });
  } catch (error) {
    console.error('Issue warning error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue agent warning.' });
  }
}

/**
 * Resolve an agent warning
 */
async function resolveAgentWarning(req, res) {
  try {
    const warningId = parseInt(req.params.id, 10);
    const { resolutionNotes } = req.body;

    await query(
      `UPDATE Agent_Warnings 
       SET status = 'RESOLVED', resolved_at = NOW(), resolution_notes = ? 
       WHERE warning_id = ?`,
      [resolutionNotes ? resolutionNotes.trim() : 'Resolved after review', warningId]
    );

    return res.json({ success: true, message: 'Warning marked as resolved.' });
  } catch (error) {
    console.error('Resolve warning error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve warning.' });
  }
}

/**
 * Reassign an order to a delivery agent (for declined or unassigned deliveries)
 */
async function reassignOrder(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'Agent ID is required.' });
    }

    const agents = await query(
      "SELECT user_id, name, branch_id FROM Users WHERE user_id = ? AND role = 'DELIVERY_AGENT' AND is_active = TRUE",
      [parseInt(agentId, 10)]
    );

    if (agents.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected delivery agent is not valid or active.' });
    }

    await query(
      `UPDATE Deliveries 
       SET agent_id = ?, assignment_status = 'ASSIGNED', decline_reason = NULL 
       WHERE order_id = ?`,
      [agents[0].user_id, orderId]
    );

    await query(
      `INSERT INTO Notifications (user_id, title, message, type, link)
       VALUES (?, 'Order Reassigned to You', ?, 'DELIVERY', '/agent/orders')`,
      [agents[0].user_id, `Order #${orderId} has been reassigned to you by the administrator.`]
    );

    return res.json({
      success: true,
      message: `Order successfully reassigned to agent ${agents[0].name}.`
    });
  } catch (error) {
    console.error('Reassign order error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reassign order.' });
  }
}

/**
 * Manage user accounts (list, verify, toggle status)
 */
async function getUsers(req, res) {
  try {
    const { role, branchId, search } = req.query;

    let sql = `
      SELECT u.user_id, u.name, u.email, u.role, u.branch_id, u.phone,
             u.vehicle_number, u.is_verified, u.is_active, u.created_at,
             b.branch_code, b.branch_name
      FROM Users u
      LEFT JOIN Branches b ON u.branch_id = b.branch_id
    `;

    const where = [];
    const params = [];

    if (role) {
      where.push('u.role = ?');
      params.push(role);
    }
    if (branchId) {
      where.push('u.branch_id = ?');
      params.push(parseInt(branchId, 10));
    }
    if (search && search.trim()) {
      where.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    sql += ' ORDER BY u.created_at DESC';

    const users = await query(sql, params);
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
}

/**
 * Approve / Verify a user
 */
async function verifyUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    await query('UPDATE Users SET is_verified = TRUE WHERE user_id = ?', [userId]);
    return res.json({ success: true, message: 'User account verified and approved.' });
  } catch (error) {
    console.error('Verify user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify user.' });
  }
}

/**
 * Get inventory stock transactions audit log
 */
async function getStockTransactions(req, res) {
  try {
    const { productId, limit = 50 } = req.query;

    let sql = `
      SELECT st.transaction_id, st.created_at, st.transaction_type,
             st.quantity_change, st.previous_stock, st.new_stock,
             st.reference_type, st.reference_id, st.notes,
             p.name AS product_name, p.sku,
             u.name AS actor_name
      FROM Stock_Transactions st
      JOIN Products p ON st.product_id = p.product_id
      LEFT JOIN Users u ON st.created_by = u.user_id
    `;

    const where = [];
    const params = [];

    if (productId) {
      where.push('st.product_id = ?');
      params.push(parseInt(productId, 10));
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    sql += ' ORDER BY st.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const transactions = await query(sql, params);
    return res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    console.error('Get stock transactions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve transactions.' });
  }
}

/**
 * Get all delivery agents with their branch details
 */
async function getDeliveryAgents(req, res) {
  try {
    const agents = await query(`
      SELECT u.user_id, u.name, u.email, u.phone, u.vehicle_number,
             u.is_verified, u.is_active, u.created_at,
             b.branch_id, b.branch_code, b.branch_name, b.department_block,
             (SELECT COUNT(*) FROM Deliveries d WHERE d.agent_id = u.user_id) AS total_deliveries,
             (SELECT COUNT(*) FROM Agent_Warnings aw WHERE aw.agent_id = u.user_id AND aw.status = 'ACTIVE') AS active_warnings
      FROM Users u
      JOIN Branches b ON u.branch_id = b.branch_id
      WHERE u.role = 'DELIVERY_AGENT'
      ORDER BY b.branch_code ASC, u.name ASC
    `);

    return res.json({ success: true, count: agents.length, agents });
  } catch (error) {
    console.error('Get delivery agents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve delivery agents.' });
  }
}

/**
 * Provision a new Delivery Agent account (Admin only)
 * Enforces one active agent per branch constraint
 */
async function createDeliveryAgent(req, res) {
  try {
    const { name, email, phone, vehicleNumber, branchId, password } = req.body;

    if (!name || !email || !branchId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, assigned branch, and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email does not already exist
    const existingEmail = await query('SELECT user_id FROM Users WHERE email = ?', [normalizedEmail]);
    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Verify branch exists and is active
    const branches = await query('SELECT branch_id, branch_name, branch_code FROM Branches WHERE branch_id = ? AND is_active = TRUE', [parseInt(branchId, 10)]);
    if (branches.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected branch is invalid or inactive.' });
    }

    // Check one active agent per branch version-1 rule
    const activeAgents = await query(
      "SELECT user_id, name FROM Users WHERE role = 'DELIVERY_AGENT' AND branch_id = ? AND is_active = TRUE",
      [parseInt(branchId, 10)]
    );

    if (activeAgents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `An active delivery agent (${activeAgents[0].name}) is already assigned to ${branches[0].branch_name}. Please deactivate the existing agent before assigning a new one.`
      });
    }

    // Validate password complexity
    const { validatePassword } = require('../validators/authValidator');
    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      return res.status(400).json({ success: false, message: passCheck.error });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO Users 
       (name, email, password_hash, role, branch_id, phone, vehicle_number, is_verified, is_active)
       VALUES (?, ?, ?, 'DELIVERY_AGENT', ?, ?, ?, TRUE, TRUE)`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        parseInt(branchId, 10),
        phone ? phone.trim() : null,
        vehicleNumber ? vehicleNumber.trim().toUpperCase() : null
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Delivery Agent account created and assigned to ${branches[0].branch_name} (${branches[0].branch_code}).`,
      agent: {
        userId: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
        branchId: parseInt(branchId, 10),
        branchName: branches[0].branch_name,
        branchCode: branches[0].branch_code
      }
    });
  } catch (error) {
    console.error('Create delivery agent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create delivery agent.' });
  }
}

/**
 * Toggle active status of a delivery agent
 */
async function toggleDeliveryAgentStatus(req, res) {
  try {
    const agentId = parseInt(req.params.id, 10);
    const agents = await query(
      "SELECT user_id, name, branch_id, is_active FROM Users WHERE user_id = ? AND role = 'DELIVERY_AGENT'",
      [agentId]
    );

    if (agents.length === 0) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found.' });
    }

    const agent = agents[0];
    const newStatus = !agent.is_active;

    // If activating, verify no other active agent on that branch
    if (newStatus && agent.branch_id) {
      const activeAgents = await query(
        "SELECT user_id, name FROM Users WHERE role = 'DELIVERY_AGENT' AND branch_id = ? AND is_active = TRUE AND user_id != ?",
        [agent.branch_id, agentId]
      );
      if (activeAgents.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot activate: Agent '${activeAgents[0].name}' is currently the designated active agent for this branch.`
        });
      }
    }

    await query('UPDATE Users SET is_active = ? WHERE user_id = ?', [newStatus, agentId]);

    return res.json({
      success: true,
      message: `Agent '${agent.name}' has been ${newStatus ? 'activated' : 'deactivated'}.`
    });
  } catch (error) {
    console.error('Toggle agent status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update agent status.' });
  }
}

/**
 * Provision an additional Administrator account (Admin only)
 */
async function createAdminUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, institutional email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await query('SELECT user_id FROM Users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const { validatePassword } = require('../validators/authValidator');
    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      return res.status(400).json({ success: false, message: passCheck.error });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO Users (name, email, password_hash, role, branch_id, is_verified, is_active)
       VALUES (?, ?, ?, 'ADMIN', NULL, TRUE, TRUE)`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: 'New administrator account provisioned successfully.',
      adminId: result.insertId
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create administrator account.' });
  }
}

module.exports = {
  getDashboardMetrics,
  createProduct,
  updateProduct,
  toggleProductStatus,
  recordPurchase,
  getSuppliers,
  createSupplier,
  getDelayedDeliveries,
  issueAgentWarning,
  resolveAgentWarning,
  reassignOrder,
  getUsers,
  verifyUser,
  getStockTransactions,
  getDeliveryAgents,
  createDeliveryAgent,
  toggleDeliveryAgentStatus,
  createAdminUser
};
