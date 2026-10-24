const { query, transaction } = require('../db/dbAdapter');
const { decryptOTP } = require('../utils/otpHelper');

/**
 * Transactional checkout for students with safe stock checking and overselling prevention
 */
async function checkout(req, res) {
  try {
    const studentId = req.user.userId;
    const branchId = req.user.branchId;
    const { items, deliveryLocation, paymentMethod = 'CASH_ON_DELIVERY' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required.' });
    }

    if (!deliveryLocation || !deliveryLocation.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Delivery location (room number/lab/department area) is required.'
      });
    }

    // Run order placement inside an ACID transaction with pessimistic locks (FOR UPDATE)
    const orderResult = await transaction(async (connection) => {
      let totalAmount = 0;
      const verifiedItems = [];

      for (const item of items) {
        const productId = parseInt(item.productId, 10);
        const requestedQuantity = parseInt(item.quantity, 10);

        if (isNaN(productId) || isNaN(requestedQuantity) || requestedQuantity <= 0) {
          throw new Error('Invalid product or quantity specified.');
        }

        // Lock product row to prevent race conditions during concurrent orders
        const [rows] = await connection.execute(
          `SELECT p.product_id, p.name, p.price, p.stock_quantity, p.is_active
           FROM Products p
           WHERE p.product_id = ? FOR UPDATE`,
          [productId]
        );

        if (rows.length === 0 || !rows[0].is_active) {
          throw new Error(`Product #${productId} is currently not available.`);
        }

        const product = rows[0];

        // Verify product is authorized for the student's branch
        const [branchLink] = await connection.execute(
          'SELECT branch_id FROM Product_Branches WHERE product_id = ? AND branch_id = ?',
          [productId, branchId]
        );

        if (branchLink.length === 0) {
          throw new Error(`Product '${product.name}' is not authorized for your university branch.`);
        }

        // Stock quantity validation - prevent overselling
        if (product.stock_quantity < requestedQuantity) {
          throw new Error(
            `Only ${product.stock_quantity} units of '${product.name}' are currently available.`
          );
        }

        const unitPrice = parseFloat(product.price);
        const lineTotal = unitPrice * requestedQuantity;
        totalAmount += lineTotal;

        verifiedItems.push({
          productId: product.product_id,
          name: product.name,
          unitPrice,
          quantity: requestedQuantity,
          lineTotal,
          previousStock: product.stock_quantity,
          newStock: product.stock_quantity - requestedQuantity
        });
      }

      // Generate unique Order Number
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${timestamp}-${randomSuffix}`;

      // Insert Order
      const [orderInsert] = await connection.execute(
        `INSERT INTO Orders 
         (order_number, student_id, branch_id, delivery_location, order_status, payment_status, payment_method, total_amount)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
        [
          orderNumber,
          studentId,
          branchId,
          deliveryLocation.trim(),
          paymentMethod === 'SIMULATED_ONLINE' ? 'PAID' : 'PENDING',
          paymentMethod,
          totalAmount
        ]
      );

      const orderId = orderInsert.insertId;

      // Insert Order Items and Update Inventory Atomically
      for (const item of verifiedItems) {
        // Insert order line item
        await connection.execute(
          `INSERT INTO Order_Items (order_id, product_id, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.quantity, item.unitPrice, item.lineTotal]
        );

        // Deduct stock safely
        await connection.execute(
          'UPDATE Products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
          [item.quantity, item.productId]
        );

        // Audit inventory reduction in Stock_Transactions
        await connection.execute(
          `INSERT INTO Stock_Transactions 
           (product_id, transaction_type, quantity_change, previous_stock, new_stock, reference_type, reference_id, notes, created_by)
           VALUES (?, 'SALE', ?, ?, ?, 'ORDER', ?, ?, ?)`,
          [
            item.productId,
            -item.quantity,
            item.previousStock,
            item.newStock,
            orderId,
            `Order placement #${orderNumber}`,
            studentId
          ]
        );
      }

      // Find designated delivery agent for this branch
      const [agentRows] = await connection.execute(
        `SELECT user_id, name, phone FROM Users 
         WHERE role = 'DELIVERY_AGENT' AND branch_id = ? AND is_active = TRUE 
         LIMIT 1`,
        [branchId]
      );

      let assignedAgentId = null;
      let assignmentStatus = 'UNASSIGNED';

      if (agentRows.length > 0) {
        assignedAgentId = agentRows[0].user_id;
        assignmentStatus = 'ASSIGNED';
      }

      // Create Delivery record
      await connection.execute(
        `INSERT INTO Deliveries (order_id, agent_id, assignment_status)
         VALUES (?, ?, ?)`,
        [orderId, assignedAgentId, assignmentStatus]
      );

      // Create in-app Notifications
      await connection.execute(
        `INSERT INTO Notifications (user_id, title, message, type, link)
         VALUES (?, 'Order Placed Successfully', ?, 'ORDER', ?)`,
        [
          studentId,
          `Your order #${orderNumber} for ₹${totalAmount.toFixed(2)} has been placed and forwarded to your branch delivery agent.`,
          `/student/orders/${orderId}`
        ]
      );

      if (assignedAgentId) {
        await connection.execute(
          `INSERT INTO Notifications (user_id, title, message, type, link)
           VALUES (?, 'New Branch Delivery Assigned', ?, 'DELIVERY', '/agent/dashboard')`,
          [
            assignedAgentId,
            `New order #${orderNumber} for ${deliveryLocation.trim()} is awaiting your acceptance.`,
          ]
        );
      }

      // Automatically clear the student's database cart upon order commitment
      await connection.execute(
        `DELETE ci FROM Cart_Items ci 
         JOIN Carts c ON ci.cart_id = c.cart_id 
         WHERE c.student_id = ?`,
        [studentId]
      );

      return {
        orderId,
        orderNumber,
        totalAmount,
        assignedAgentId,
        itemsCount: verifiedItems.length
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully and stock reserved.',
      order: orderResult
    });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return res.status(400).json({ success: false, message: error.message || 'Failed to place order.' });
  }
}

/**
 * Get all orders placed by authenticated student
 */
async function getMyOrders(req, res) {
  try {
    const studentId = req.user.userId;

    const orders = await query(
      `SELECT o.order_id, o.order_number, o.order_status, o.payment_status,
              o.payment_method, o.total_amount, o.delivery_location, o.created_at,
              b.branch_code, b.branch_name,
              d.assignment_status, d.dispatched_at, d.delivered_at,
              u.name AS agent_name, u.phone AS agent_phone,
              (SELECT COUNT(*) FROM Order_Items oi WHERE oi.order_id = o.order_id) AS items_count
       FROM Orders o
       JOIN Branches b ON o.branch_id = b.branch_id
       LEFT JOIN Deliveries d ON o.order_id = d.order_id
       LEFT JOIN Users u ON d.agent_id = u.user_id
       WHERE o.student_id = ?
       ORDER BY o.created_at DESC`,
      [studentId]
    );

    return res.json({ success: true, orders });
  } catch (error) {
    console.error('Get my orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order history.' });
  }
}

/**
 * Get single order details with items and OTP if student is authorized
 */
async function getOrderDetails(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const user = req.user;

    const orders = await query(
      `SELECT o.order_id, o.order_number, o.student_id, o.branch_id,
              o.delivery_location, o.order_status, o.payment_status, o.payment_method,
              o.total_amount, o.cancellation_reason, o.created_at, o.updated_at,
              b.branch_code, b.branch_name, b.department_block,
              stu.name AS student_name, stu.email AS student_email, stu.phone AS student_phone,
              d.delivery_id, d.agent_id, d.assignment_status, d.accepted_at, d.dispatched_at,
              d.delivered_at, d.delivery_duration_minutes, d.otp_encrypted_student,
              d.otp_expires_at, d.failed_attempt_count, d.decline_reason,
              agent.name AS agent_name, agent.phone AS agent_phone, agent.vehicle_number AS agent_vehicle
       FROM Orders o
       JOIN Branches b ON o.branch_id = b.branch_id
       JOIN Users stu ON o.student_id = stu.user_id
       LEFT JOIN Deliveries d ON o.order_id = d.order_id
       LEFT JOIN Users agent ON d.agent_id = agent.user_id
       WHERE o.order_id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];

    // Authorization checks
    if (user.role === 'STUDENT' && order.student_id !== user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied to this order.' });
    }
    if (user.role === 'DELIVERY_AGENT' && order.branch_id !== user.branchId) {
      return res.status(403).json({ success: false, message: 'Access restricted to your branch orders.' });
    }

    // Retrieve order items
    const items = await query(
      `SELECT oi.order_item_id, oi.product_id, oi.quantity, oi.unit_price, oi.line_total,
              p.name AS product_name, p.sku, p.description
       FROM Order_Items oi
       JOIN Products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    // Decrypt delivery OTP ONLY for the student who placed the order and when out for delivery
    let deliveryOtp = null;
    if (
      user.role === 'STUDENT' &&
      order.student_id === user.userId &&
      order.otp_encrypted_student &&
      (order.order_status === 'OUT_FOR_DELIVERY' || order.order_status === 'ACCEPTED')
    ) {
      deliveryOtp = decryptOTP(order.otp_encrypted_student);
    }

    // Sanitized response - never leak encrypted or hashed OTP
    delete order.otp_encrypted_student;

    return res.json({
      success: true,
      order: {
        ...order,
        total_amount: parseFloat(order.total_amount),
        deliveryOtp,
        items: items.map(item => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          line_total: parseFloat(item.line_total)
        }))
      }
    });
  } catch (error) {
    console.error('Get order details error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order details.' });
  }
}

/**
 * Cancel order with transactional stock restoration
 */
async function cancelOrder(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { reason = 'Cancelled by user' } = req.body;
    const user = req.user;

    const cancelResult = await transaction(async (connection) => {
      // Lock order row
      const [orderRows] = await connection.execute(
        'SELECT order_id, order_number, student_id, order_status, is_stock_restored FROM Orders WHERE order_id = ? FOR UPDATE',
        [orderId]
      );

      if (orderRows.length === 0) {
        throw new Error('Order not found.');
      }

      const order = orderRows[0];

      // Student can only cancel their own order
      if (user.role === 'STUDENT' && order.student_id !== user.userId) {
        throw new Error('Access denied to cancel this order.');
      }

      // Can only cancel if PENDING or ACCEPTED
      if (!['PENDING', 'ACCEPTED'].includes(order.order_status)) {
        throw new Error(`Order cannot be cancelled in '${order.order_status}' status.`);
      }

      // Guard against duplicate stock restoration
      if (order.is_stock_restored) {
        throw new Error('Stock has already been restored for this order.');
      }

      // Fetch items to restore
      const [items] = await connection.execute(
        'SELECT product_id, quantity FROM Order_Items WHERE order_id = ?',
        [orderId]
      );

      for (const item of items) {
        // Fetch current stock
        const [prodRows] = await connection.execute(
          'SELECT stock_quantity FROM Products WHERE product_id = ? FOR UPDATE',
          [item.product_id]
        );
        const currentStock = prodRows[0].stock_quantity;
        const newStock = currentStock + item.quantity;

        // Restore stock
        await connection.execute(
          'UPDATE Products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );

        // Record restock movement in Stock_Transactions
        await connection.execute(
          `INSERT INTO Stock_Transactions 
           (product_id, transaction_type, quantity_change, previous_stock, new_stock, reference_type, reference_id, notes, created_by)
           VALUES (?, 'CANCELLATION_RESTOCK', ?, ?, ?, 'ORDER', ?, ?, ?)`,
          [
            item.product_id,
            item.quantity,
            currentStock,
            newStock,
            orderId,
            `Stock restored on order cancellation #${order.order_number}`,
            user.userId
          ]
        );
      }

      // Update Order Status
      await connection.execute(
        `UPDATE Orders 
         SET order_status = 'CANCELLED', payment_status = 'CANCELLED', cancellation_reason = ?, is_stock_restored = TRUE 
         WHERE order_id = ?`,
        [reason, orderId]
      );

      // Update Delivery Status
      await connection.execute(
        `UPDATE Deliveries SET assignment_status = 'DECLINED', decline_reason = ? WHERE order_id = ?`,
        [`Order cancelled: ${reason}`, orderId]
      );

      return { orderNumber: order.order_number, restoredItemsCount: items.length };
    });

    return res.json({
      success: true,
      message: `Order #${cancelResult.orderNumber} successfully cancelled and stock restored to inventory.`,
      result: cancelResult
    });
  } catch (error) {
    console.error('Cancel order error:', error.message);
    return res.status(400).json({ success: false, message: error.message || 'Failed to cancel order.' });
  }
}

/**
 * Admin view of all orders across university branches
 */
async function getAllOrders(req, res) {
  try {
    const { branchId, status, search, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT o.order_id, o.order_number, o.order_status, o.payment_status,
              o.payment_method, o.total_amount, o.delivery_location, o.created_at,
              b.branch_code, b.branch_name,
              stu.name AS student_name, stu.email AS student_email,
              agent.name AS agent_name, agent.phone AS agent_phone,
              d.assignment_status, d.is_delayed, d.delivery_duration_minutes
       FROM Orders o
       JOIN Branches b ON o.branch_id = b.branch_id
       JOIN Users stu ON o.student_id = stu.user_id
       LEFT JOIN Deliveries d ON o.order_id = d.order_id
       LEFT JOIN Users agent ON d.agent_id = agent.user_id
    `;

    const where = [];
    const params = [];

    if (branchId) {
      where.push('o.branch_id = ?');
      params.push(parseInt(branchId, 10));
    }

    if (status) {
      where.push('o.order_status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      where.push('(o.order_number LIKE ? OR stu.name LIKE ? OR stu.email LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const orders = await query(sql, params);

    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
}

module.exports = {
  checkout,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getAllOrders
};
