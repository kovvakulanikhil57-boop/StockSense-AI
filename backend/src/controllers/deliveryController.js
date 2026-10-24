const { query, transaction } = require('../db/dbAdapter');
const { generateOTP, hashOTP, encryptOTP, verifyOTPHash } = require('../utils/otpHelper');

const DELIVERY_THRESHOLD_MINUTES = parseInt(process.env.DELIVERY_THRESHOLD_MINUTES || '30', 10);
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10);
const MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS || '5', 10);

/**
 * Get orders assigned to the logged-in delivery agent's branch
 */
async function getAgentOrders(req, res) {
  try {
    const agentId = req.user.userId;
    const branchId = req.user.branchId;

    if (!branchId) {
      return res.status(403).json({ success: false, message: 'Agent is not linked to any active branch.' });
    }

    const { status } = req.query;

    let sql = `
      SELECT o.order_id, o.order_number, o.order_status, o.payment_status,
             o.payment_method, o.total_amount, o.delivery_location, o.created_at,
             b.branch_code, b.branch_name, b.department_block,
             stu.name AS student_name, stu.phone AS student_phone, stu.email AS student_email,
             d.delivery_id, d.assignment_status, d.accepted_at, d.dispatched_at,
             d.delivered_at, d.delivery_duration_minutes, d.is_delayed,
             d.failed_attempt_count, d.decline_reason,
             (SELECT COUNT(*) FROM Order_Items oi WHERE oi.order_id = o.order_id) AS items_count
      FROM Orders o
      JOIN Branches b ON o.branch_id = b.branch_id
      JOIN Users stu ON o.student_id = stu.user_id
      JOIN Deliveries d ON o.order_id = d.order_id
      WHERE o.branch_id = ? AND (d.agent_id = ? OR d.agent_id IS NULL)
    `;

    const params = [branchId, agentId];

    if (status) {
      sql += ' AND o.order_status = ?';
      params.push(status);
    } else {
      // By default show active and recent orders
      sql += " AND o.order_status != 'CANCELLED'";
    }

    sql += ' ORDER BY FIELD(o.order_status, "PENDING", "ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED") ASC, o.created_at DESC';

    const orders = await query(sql, params);

    // Also fetch items for these orders
    for (const order of orders) {
      const items = await query(
        `SELECT oi.quantity, oi.unit_price, oi.line_total, p.name AS product_name, p.sku
         FROM Order_Items oi
         JOIN Products p ON oi.product_id = p.product_id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = items;
    }

    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get agent orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agent deliveries.' });
  }
}

/**
 * Agent accepts an order
 */
async function acceptOrder(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const agentId = req.user.userId;
    const branchId = req.user.branchId;

    const result = await transaction(async (connection) => {
      // Verify order belongs to agent's branch
      const [orders] = await connection.execute(
        'SELECT order_id, order_number, branch_id, order_status FROM Orders WHERE order_id = ? FOR UPDATE',
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('Order not found.');
      }

      const order = orders[0];

      if (order.branch_id !== branchId) {
        throw new Error('Permission denied. Order does not belong to your assigned branch.');
      }

      if (order.order_status !== 'PENDING') {
        throw new Error(`Order cannot be accepted in '${order.order_status}' status.`);
      }

      // Update Order & Delivery
      await connection.execute(
        "UPDATE Orders SET order_status = 'ACCEPTED' WHERE order_id = ?",
        [orderId]
      );

      await connection.execute(
        `UPDATE Deliveries 
         SET agent_id = ?, assignment_status = 'ACCEPTED', accepted_at = NOW() 
         WHERE order_id = ?`,
        [agentId, orderId]
      );

      return order;
    });

    return res.json({
      success: true,
      message: `Order #${result.order_number} accepted. Please proceed to pick up items from store.`
    });
  } catch (error) {
    console.error('Accept order error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Agent declines an order with a reason (Alerts Admin for reassignment)
 */
async function declineOrder(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const agentId = req.user.userId;
    const branchId = req.user.branchId;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A reason for declining must be provided.' });
    }

    const result = await transaction(async (connection) => {
      const [orders] = await connection.execute(
        'SELECT order_id, order_number, branch_id, order_status FROM Orders WHERE order_id = ? FOR UPDATE',
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('Order not found.');
      }

      const order = orders[0];

      if (order.branch_id !== branchId) {
        throw new Error('Permission denied. Order does not belong to your assigned branch.');
      }

      if (!['PENDING', 'ACCEPTED'].includes(order.order_status)) {
        throw new Error(`Cannot decline order in '${order.order_status}' status.`);
      }

      // Mark Delivery as DECLINED and reset order agent
      await connection.execute(
        `UPDATE Deliveries 
         SET assignment_status = 'DECLINED', decline_reason = ?, agent_id = NULL 
         WHERE order_id = ?`,
        [reason.trim(), orderId]
      );

      // Create Admin Notification for quick reassignment
      const [admins] = await connection.execute("SELECT user_id FROM Users WHERE role = 'ADMIN'");
      for (const admin of admins) {
        await connection.execute(
          `INSERT INTO Notifications (user_id, title, message, type, link)
           VALUES (?, 'Delivery Agent Declined Order', ?, 'DELIVERY', '/admin/orders')`,
          [
            admin.user_id,
            `Agent ${req.user.name} declined Order #${order.order_number}. Reason: ${reason.trim()}`
          ]
        );
      }

      return order;
    });

    return res.json({
      success: true,
      message: `Order #${result.order_number} declined and flagged for admin reassignment.`
    });
  } catch (error) {
    console.error('Decline order error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Mark order as Out for Delivery:
 * Generates cryptographically secure OTP, stores SHA-256 hash in Deliveries,
 * encrypts OTP for student retrieval, and sets 15-minute expiry.
 */
async function markOutForDelivery(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const agentId = req.user.userId;
    const branchId = req.user.branchId;

    const result = await transaction(async (connection) => {
      const [orders] = await connection.execute(
        `SELECT o.order_id, o.order_number, o.student_id, o.branch_id, o.order_status,
                d.agent_id, d.assignment_status
         FROM Orders o
         JOIN Deliveries d ON o.order_id = d.order_id
         WHERE o.order_id = ? FOR UPDATE`,
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('Order not found.');
      }

      const order = orders[0];

      if (order.branch_id !== branchId || (order.agent_id && order.agent_id !== agentId)) {
        throw new Error('Permission denied. You are not the assigned agent for this order.');
      }

      if (order.order_status !== 'ACCEPTED') {
        throw new Error(`Order must be in 'ACCEPTED' status before dispatching. Current: ${order.order_status}`);
      }

      // Generate cryptographically secure OTP
      const plainOTP = generateOTP();
      const otpHashValue = hashOTP(plainOTP);
      const encryptedStudentPayload = encryptOTP(plainOTP);

      // Expiry timestamp: calculated safely in Node.js (cross-database compatible)
      const expiryTime = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Update Deliveries: store hash and student-encrypted payload
      await connection.execute(
        `UPDATE Deliveries 
         SET assignment_status = 'DISPATCHED', dispatched_at = NOW(),
             otp_hash = ?, otp_encrypted_student = ?, otp_expires_at = ?,
             failed_attempt_count = 0
         WHERE order_id = ?`,
        [otpHashValue, encryptedStudentPayload, expiryTime, orderId]
      );

      // Update Order Status
      await connection.execute(
        "UPDATE Orders SET order_status = 'OUT_FOR_DELIVERY' WHERE order_id = ?",
        [orderId]
      );

      // Notify student with instruction to provide OTP upon arrival
      await connection.execute(
        `INSERT INTO Notifications (user_id, title, message, type, link)
         VALUES (?, 'Your Stationery Order is Out for Delivery!', ?, 'DELIVERY', ?)`,
        [
          order.student_id,
          `Order #${order.order_number} is out for delivery with ${req.user.name}. Check your order page for your secure Delivery Verification OTP.`,
          `/student/orders/${orderId}`
        ]
      );

      return { orderNumber: order.order_number, expiryTime };
    });

    return res.json({
      success: true,
      message: `Order #${result.orderNumber} is now out for delivery. Student has been notified with the verification OTP.`
    });
  } catch (error) {
    console.error('Mark out for delivery error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Verify delivery OTP and complete delivery (Idempotent, rate limited, duration calculated)
 */
async function verifyDeliveryOTP(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const agentId = req.user.userId;
    const branchId = req.user.branchId;
    const { otp } = req.body;

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'A valid 6-digit OTP is required.' });
    }

    const submittedOTP = otp.trim();

    const result = await transaction(async (connection) => {
      // Lock delivery & order row
      const [rows] = await connection.execute(
        `SELECT d.delivery_id, d.order_id, d.agent_id, d.assignment_status,
                d.accepted_at, d.otp_hash, d.otp_expires_at, d.failed_attempt_count,
                o.order_number, o.branch_id, o.order_status, o.student_id
         FROM Deliveries d
         JOIN Orders o ON d.order_id = o.order_id
         WHERE d.order_id = ? FOR UPDATE`,
        [orderId]
      );

      if (rows.length === 0) {
        throw new Error('Delivery record not found.');
      }

      const delivery = rows[0];

      // Branch and agent authorization check
      if (delivery.branch_id !== branchId || delivery.agent_id !== agentId) {
        throw new Error('Access denied. You are not authorized for this delivery.');
      }

      // Idempotency: If already delivered, return success immediately without recalculating
      if (delivery.assignment_status === 'DELIVERED' || delivery.order_status === 'DELIVERED') {
        return {
          alreadyDelivered: true,
          orderNumber: delivery.order_number,
          message: 'Order was already completed.'
        };
      }

      if (delivery.assignment_status !== 'DISPATCHED' || delivery.order_status !== 'OUT_FOR_DELIVERY') {
        throw new Error(`Cannot verify OTP for an order in '${delivery.order_status}' status.`);
      }

      // Brute-force protection: check failed attempt count
      if (delivery.failed_attempt_count >= MAX_OTP_ATTEMPTS) {
        throw new Error(
          `Delivery locked: Maximum incorrect attempts (${MAX_OTP_ATTEMPTS}) exceeded. Please contact the store administrator.`
        );
      }

      // Expiry check
      const now = new Date();
      if (new Date(delivery.otp_expires_at) < now) {
        throw new Error('Delivery OTP has expired. Please ask the store or student for a refresh.');
      }

      // Verify OTP hash
      const isValid = verifyOTPHash(submittedOTP, delivery.otp_hash);

      if (!isValid) {
        const newAttempts = delivery.failed_attempt_count + 1;
        await connection.execute(
          'UPDATE Deliveries SET failed_attempt_count = ? WHERE delivery_id = ?',
          [newAttempts, delivery.delivery_id]
        );
        const remaining = MAX_OTP_ATTEMPTS - newAttempts;
        throw new Error(
          `Invalid OTP! ${remaining > 0 ? `${remaining} attempts remaining.` : 'Maximum attempts reached.'}`
        );
      }

      // Calculate delivery duration in minutes from accepted_at to now (cross-database compatible)
      const acceptedTimestamp = delivery.accepted_at ? new Date(delivery.accepted_at).getTime() : Date.now();
      const durationMinutes = Math.max(0, Math.round((Date.now() - acceptedTimestamp) / 60000));

      const isDelayed = durationMinutes > DELIVERY_THRESHOLD_MINUTES;

      // Update Delivery
      await connection.execute(
        `UPDATE Deliveries 
         SET assignment_status = 'DELIVERED', delivered_at = NOW(),
             delivery_duration_minutes = ?, is_delayed = ?,
             otp_hash = NULL, otp_encrypted_student = NULL
         WHERE delivery_id = ?`,
        [durationMinutes, isDelayed, delivery.delivery_id]
      );

      // Update Order
      await connection.execute(
        `UPDATE Orders 
         SET order_status = 'DELIVERED', payment_status = 'PAID' 
         WHERE order_id = ?`,
        [orderId]
      );

      // Notifications
      await connection.execute(
        `INSERT INTO Notifications (user_id, title, message, type, link)
         VALUES (?, 'Order Delivered Successfully', ?, 'DELIVERY', ?)`,
        [
          delivery.student_id,
          `Your order #${delivery.order_number} has been verified and marked as delivered by ${req.user.name}.`,
          `/student/orders/${orderId}`
        ]
      );

      // If delayed, notify admin for review
      if (isDelayed) {
        const [admins] = await connection.execute("SELECT user_id FROM Users WHERE role = 'ADMIN'");
        for (const admin of admins) {
          await connection.execute(
            `INSERT INTO Notifications (user_id, title, message, type, link)
             VALUES (?, 'Delayed Delivery Alert', ?, 'WARNING', '/admin/warnings')`,
            [
              admin.user_id,
              `Order #${delivery.order_number} took ${durationMinutes} mins to deliver (exceeded threshold of ${DELIVERY_THRESHOLD_MINUTES} mins).`
            ]
          );
        }
      }

      return {
        orderNumber: delivery.order_number,
        durationMinutes,
        isDelayed
      };
    });

    return res.json({
      success: true,
      message: `Delivery for Order #${result.orderNumber} successfully completed and verified!`,
      delivery: result
    });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Get active warnings for the logged-in delivery agent
 */
async function getAgentWarnings(req, res) {
  try {
    const agentId = req.user.userId;

    const warnings = await query(
      `SELECT aw.warning_id, aw.reason, aw.status, aw.created_at, aw.resolved_at,
              aw.resolution_notes, o.order_number, u.name AS issued_by_name
       FROM Agent_Warnings aw
       JOIN Users u ON aw.issued_by = u.user_id
       LEFT JOIN Orders o ON aw.order_id = o.order_id
       WHERE aw.agent_id = ?
       ORDER BY aw.created_at DESC`,
      [agentId]
    );

    return res.json({ success: true, count: warnings.length, warnings });
  } catch (error) {
    console.error('Get agent warnings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agent warnings.' });
  }
}

module.exports = {
  getAgentOrders,
  acceptOrder,
  declineOrder,
  markOutForDelivery,
  verifyDeliveryOTP,
  getAgentWarnings
};
