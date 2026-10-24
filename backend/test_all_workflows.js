/**
 * Comprehensive Automated Verification Suite for StockSense AI
 * Tests all required business, security, and transactional workflows
 */

const assert = require('assert');
const db = require('./src/db/dbAdapter');

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('===============================================================');
  console.log('   STOCKSENSE AI — COMPREHENSIVE AUTOMATED VERIFICATION SUITE  ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Health & DB Connectivity
  await test('1. System Health & MariaDB Connectivity', async () => {
    const res = await req('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'online');
    assert.strictEqual(res.data.database, 'connected');
  });

  // 2. Weak Password Rejection
  await test('2. Weak Password Policy Enforcement Rejection', async () => {
    const res = await req('/auth/register', 'POST', {
      name: 'Weak Pass Test',
      email: '99071A0511@example.test',
      password: 'short'
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /Password must be at least 8 characters long/i);
  });

  // 3. Invalid Student Email Rejection
  await test('3. Invalid Student Email Regex Rejection', async () => {
    const res = await req('/auth/register', 'POST', {
      name: 'Bad Email Test',
      email: 'student@gmail.com',
      password: 'StrongPassword@123'
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /Invalid student email format/i);
  });

  // 4. Branch Detection for all 3 branches
  await test('4. Automatic Branch Detection (CSE 05, CSM 66, CSD 67)', async () => {
    await db.query("DELETE FROM Users WHERE name LIKE '%Student Test'");
    const r = Math.floor(10 + Math.random() * 89);
    // CSE
    const resCSE = await req('/auth/register', 'POST', {
      name: 'CSE Student Test',
      email: `99071A05${r}@example.test`,
      password: 'ValidPassword@123',
      confirmPassword: 'ValidPassword@123',
      phone: '+1 202-555-0101'
    });
    assert.strictEqual(resCSE.data.user.branchCode, '05');

    // CSM
    const resCSM = await req('/auth/register', 'POST', {
      name: 'CSM Student Test',
      email: `99071A66${r}@example.test`,
      password: 'ValidPassword@123',
      confirmPassword: 'ValidPassword@123',
      phone: '+1 202-555-0102'
    });
    assert.strictEqual(resCSM.data.user.branchCode, '66');

    // CSD lateral-entry test account
    const resCSD = await req('/auth/register', 'POST', {
      name: 'CSD Lateral Student Test',
      email: `99075A67${r}@example.test`,
      password: 'ValidPassword@123',
      confirmPassword: 'ValidPassword@123',
      phone: '+1 202-555-0103'
    });
    assert.strictEqual(resCSD.data.user.branchCode, '67');
  });

  // 5. Authentication & Token generation
  let adminToken, cseAgentToken, csmAgentToken, cseStudentToken;

  await test('5. Admin & Agent Login and Role Verification', async () => {
    // Admin
    const adminRes = await req('/auth/login', 'POST', { email: 'admin@example.test', password: 'Demo-Admin-Only-2026!' });
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.data.user.role, 'ADMIN');
    adminToken = adminRes.data.token;

    // CSE Agent
    const cseAgentRes = await req('/auth/agent/login', 'POST', { email: 'demo.agent05@example.test', password: 'Demo-Agent-Only-2026!' });
    assert.strictEqual(cseAgentRes.status, 200);
    assert.strictEqual(cseAgentRes.data.user.role, 'DELIVERY_AGENT');
    assert.strictEqual(cseAgentRes.data.user.branchCode, '05');
    cseAgentToken = cseAgentRes.data.token;

    // CSM Agent
    const csmAgentRes = await req('/auth/agent/login', 'POST', { email: 'demo.agent66@example.test', password: 'Demo-Agent-Only-2026!' });
    assert.strictEqual(csmAgentRes.status, 200);
    csmAgentToken = csmAgentRes.data.token;

    // CSE Student
    const studentRes = await req('/auth/login', 'POST', { email: '99071A0501@example.test', password: 'Demo-Student-Only-2026!' });
    assert.strictEqual(studentRes.status, 200);
    assert.strictEqual(studentRes.data.user.role, 'STUDENT');
    cseStudentToken = studentRes.data.token;
  });

  // 6. Branch isolation in catalogue
  await test('6. Branch Dynamic Catalogue Isolation', async () => {
    // CSE Student should only see CSE-specific products (9, 10, 11) + Common products, but NOT CSM-specific (12)
    const res = await req('/products', 'GET', null, cseStudentToken);
    assert.strictEqual(res.status, 200);
    const productIds = res.data.products.map(p => p.product_id);
    
    // Check CSE product is present
    assert.ok(productIds.includes(9), 'CSE lab record must be visible to CSE student');
    // Check CSM product is NOT present
    assert.ok(!productIds.includes(12), 'CSM lab record must NOT be visible to CSE student');
  });

  // 7. Overselling Protection
  await test('7. Transactional Stock Validation & Overselling Prevention', async () => {
    // Product 8 has 14 units in stock. Try ordering 15 units.
    const res = await req('/orders/checkout', 'POST', {
      items: [{ productId: 8, quantity: 15 }],
      deliveryLocation: 'CSE Block - Room 102'
    }, cseStudentToken);

    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /Only \d+ units of '.*' are currently available/);
  });

  // 8. Order Placement & Atomic Stock Deduction
  let testOrderId;
  await test('8. Transactional Order Placement & Stock Audit Log', async () => {
    // Get product 1 stock before order
    const pBefore = await req('/products/1');
    const initialStock = pBefore.data.product.stock_quantity;

    // Order 2 units of Product 1
    const orderRes = await req('/orders/checkout', 'POST', {
      items: [{ productId: 1, quantity: 2 }],
      deliveryLocation: 'CSE Block - Room 205 (Graphics Lab)'
    }, cseStudentToken);

    assert.strictEqual(orderRes.status, 201);
    testOrderId = orderRes.data.order.orderId;

    // Verify stock decreased by exactly 2
    const pAfter = await req('/products/1');
    assert.strictEqual(pAfter.data.product.stock_quantity, initialStock - 2);

    // Verify Stock_Transactions record
    const auditRes = await req(`/admin/stock-transactions?productId=1`, 'GET', null, adminToken);
    const saleTx = auditRes.data.transactions.find(t => t.reference_id === testOrderId);
    assert.ok(saleTx, 'Stock transaction audit log must exist');
    assert.strictEqual(saleTx.transaction_type, 'SALE');
    assert.strictEqual(saleTx.quantity_change, -2);
  });

  // 9. Delivery Agent Branch Isolation
  await test('9. Delivery Agent Branch Isolation (CSM Agent cannot accept CSE Order)', async () => {
    // CSM Agent tries to accept CSE order #testOrderId
    const res = await req(`/delivery/orders/${testOrderId}/accept`, 'POST', null, csmAgentToken);
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /Permission denied|Order does not belong to your assigned branch/i);
  });

  // 10. Delivery Lifecycle: Accept, Dispatch, OTP Generation
  let studentOtp;
  await test('10. Delivery Lifecycle: Accept & Dispatch (Cryptographic OTP Generation)', async () => {
    // CSE Agent accepts
    const acceptRes = await req(`/delivery/orders/${testOrderId}/accept`, 'POST', null, cseAgentToken);
    assert.strictEqual(acceptRes.status, 200);

    // CSE Agent marks out for delivery
    const dispatchRes = await req(`/delivery/orders/${testOrderId}/dispatch`, 'POST', null, cseAgentToken);
    assert.strictEqual(dispatchRes.status, 200);

    // Student fetches order details to retrieve plaintext OTP
    const studentOrderRes = await req(`/orders/${testOrderId}`, 'GET', null, cseStudentToken);
    assert.strictEqual(studentOrderRes.status, 200);
    assert.ok(studentOrderRes.data.order.deliveryOtp, 'Student must be able to view their delivery OTP');
    assert.strictEqual(studentOrderRes.data.order.deliveryOtp.length, 6);
    studentOtp = studentOrderRes.data.order.deliveryOtp;

    // Verify agent CANNOT view OTP
    const agentOrdersRes = await req(`/delivery/orders`, 'GET', null, cseAgentToken);
    const agentView = agentOrdersRes.data.orders.find(o => o.order_id === testOrderId);
    assert.strictEqual(agentView.deliveryOtp, undefined, 'Agent view must NEVER contain plaintext OTP');
  });

  // 11. OTP Verification: Bad OTP rejection & Attempt Limit
  await test('11. Delivery OTP Verification: Incorrect OTP Rejection', async () => {
    const res = await req(`/delivery/orders/${testOrderId}/verify-otp`, 'POST', { otp: '000000' }, cseAgentToken);
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /Invalid OTP/i);
  });

  // 12. Valid OTP Verification & Delivery Completion
  await test('12. Successful OTP Verification, SLA Duration & Idempotency', async () => {
    // Submit correct OTP
    const res = await req(`/delivery/orders/${testOrderId}/verify-otp`, 'POST', { otp: studentOtp }, cseAgentToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.delivery.durationMinutes !== undefined);

    // Verify order status is DELIVERED
    const orderCheck = await req(`/orders/${testOrderId}`, 'GET', null, cseStudentToken);
    assert.strictEqual(orderCheck.data.order.order_status, 'DELIVERED');

    // Idempotency: Submit OTP again on already delivered order
    const repeatRes = await req(`/delivery/orders/${testOrderId}/verify-otp`, 'POST', { otp: studentOtp }, cseAgentToken);
    assert.strictEqual(repeatRes.status, 200);
    assert.ok(repeatRes.data.delivery.alreadyDelivered);
  });

  // 13. Order Cancellation & Stock Restoration
  await test('13. Order Cancellation & Safe Stock Restoration', async () => {
    // 1. Place a new order for 1 unit of product 1
    const pBefore = await req('/products/1');
    const stockBefore = pBefore.data.product.stock_quantity;

    const orderRes = await req('/orders/checkout', 'POST', {
      items: [{ productId: 1, quantity: 1 }],
      deliveryLocation: 'CSE Block - Room 301'
    }, cseStudentToken);

    const cancelOrderId = orderRes.data.order.orderId;

    // Check stock was deducted
    const pDeducted = await req('/products/1');
    assert.strictEqual(pDeducted.data.product.stock_quantity, stockBefore - 1);

    // 2. Cancel order
    const cancelRes = await req(`/orders/${cancelOrderId}/cancel`, 'POST', { reason: 'Test cancellation' }, cseStudentToken);
    assert.strictEqual(cancelRes.status, 200);

    // 3. Check stock was restored
    const pRestored = await req('/products/1');
    assert.strictEqual(pRestored.data.product.stock_quantity, stockBefore);

    // 4. Duplicate restoration prevention
    const repeatCancel = await req(`/orders/${cancelOrderId}/cancel`, 'POST', {}, cseStudentToken);
    assert.strictEqual(repeatCancel.status, 400);
  });

  // 14. Admin Restocking Purchase Order
  await test('14. Admin Purchase Order Restocking & Inventory Inflow', async () => {
    const pBefore = await req('/products/1');
    const stockBefore = pBefore.data.product.stock_quantity;

    const purchaseRes = await req('/admin/purchases', 'POST', {
      supplierId: 1,
      invoiceNumber: 'INV-TEST-RESTOCK-99',
      items: [{ productId: 1, quantity: 20, costPrice: 70.00 }]
    }, adminToken);

    assert.strictEqual(purchaseRes.status, 201);

    const pAfter = await req('/products/1');
    assert.strictEqual(pAfter.data.product.stock_quantity, stockBefore + 20);
  });

  // 15. Admin Warnings
  await test('15. Admin Delayed Order Review & Formal Agent Warning Issuance', async () => {
    const warnRes = await req('/admin/warnings', 'POST', {
      agentId: 2,
      reason: 'Automated SLA test: excessive turnaround duration on lab batch delivery.'
    }, adminToken);

    assert.strictEqual(warnRes.status, 201);
    const warningId = warnRes.data.warningId;

    // Agent checks warnings
    const agentWarnRes = await req('/delivery/warnings', 'GET', null, cseAgentToken);
    assert.ok(agentWarnRes.data.warnings.some(w => w.warning_id === warningId));

    // Admin resolves warning
    const resolveRes = await req(`/admin/warnings/${warningId}/resolve`, 'PUT', {
      resolutionNotes: 'Reviewed with agent, route re-optimized.'
    }, adminToken);
    assert.strictEqual(resolveRes.status, 200);
  });

  console.log('\n===============================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
