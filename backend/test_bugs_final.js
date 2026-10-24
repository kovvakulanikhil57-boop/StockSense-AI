/**
 * StockSense AI — Final Bug Verification Test
 * Covers all 6 reported bugs
 */

const http = require('http');

async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path: '/api' + path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  let pass = 0, fail = 0;
  const ok = (label, cond, msg) => {
    cond ? pass++ : fail++;
    console.log((cond ? 'PASS' : 'FAIL') + ' ' + label + (msg ? ' (' + msg + ')' : ''));
  };

  const db = require('./src/db/dbAdapter');

  console.log('\n=== BUG 1 & 2: Login tests (Admin + Agent) ===');
  let r = await req('POST', '/auth/login', { email: 'admin@example.test', password: 'Demo-Admin-Only-2026!', expectedRole: 'ADMIN' });
  ok('Admin login', r.body.success && r.body.user.role === 'ADMIN', r.body.user && r.body.user.name);
  const adminTok = r.body.token;

  r = await req('POST', '/auth/login', { email: 'demo.agent05@example.test', password: 'Demo-Agent-Only-2026!', expectedRole: 'DELIVERY_AGENT' });
  ok('CSE Agent (05) login', r.body.success && r.body.user.role === 'DELIVERY_AGENT', r.body.user && r.body.user.name);

  r = await req('POST', '/auth/login', { email: 'demo.agent66@example.test', password: 'Demo-Agent-Only-2026!', expectedRole: 'DELIVERY_AGENT' });
  ok('CSM Agent (66) login', r.body.success && r.body.user.role === 'DELIVERY_AGENT', r.body.user && r.body.user.name);

  r = await req('POST', '/auth/login', { email: 'demo.agent67@example.test', password: 'Demo-Agent-Only-2026!', expectedRole: 'DELIVERY_AGENT' });
  ok('CSD Agent (67) login', r.body.success && r.body.user.role === 'DELIVERY_AGENT', r.body.user && r.body.user.name);

  r = await req('POST', '/auth/login', { email: 'admin@example.test', password: 'WrongPass@123', expectedRole: 'ADMIN' });
  ok('Wrong password rejected (401)', r.status === 401 && !r.body.success, r.body.message);

  r = await req('POST', '/auth/login', { email: 'demo.agent66@example.test', password: 'Demo-Agent-Only-2026!', expectedRole: 'ADMIN' });
  ok('Agent role mismatch (403)', r.status === 403 && !r.body.success, r.body.message);

  r = await req('GET', '/auth/profile', null, adminTok);
  ok('Admin profile via JWT', r.body.success && r.body.profile && r.body.profile.role === 'ADMIN', r.body.profile && r.body.profile.email);

  r = await req('GET', '/admin/metrics', null, adminTok);
  ok('Admin metrics API accessible', r.body.success, 'loaded');

  console.log('\n=== BUG 3: Student registration & validation ===');
  const ts = Date.now().toString().slice(-2);
  r = await req('POST', '/auth/register', { name: 'Test CSE', email: ('99071A05' + ts + '@example.test'), password: 'Test@12345', confirmPassword: 'Test@12345' });
  ok('CSE reg (branch auto-detect 05)', r.body.success && r.body.user && r.body.user.branchCode === '05', r.body.message);

  r = await req('POST', '/auth/register', { name: 'Test CSM', email: ('99071A66' + ts + '@example.test'), password: 'Test@12345', confirmPassword: 'Test@12345' });
  ok('CSM reg (branch auto-detect 66)', r.body.success && r.body.user && r.body.user.branchCode === '66', r.body.message);

  r = await req('POST', '/auth/register', { name: 'CSD Lat', email: ('99075A67' + ts + '@example.test'), password: 'Test@12345', confirmPassword: 'Test@12345' });
  ok('CSD lateral reg (branch auto-detect 67)', r.body.success && r.body.user && r.body.user.branchCode === '67', r.body.message);

  r = await req('POST', '/auth/register', { name: 'Dup', email: '99071A0501@example.test', password: 'Test@12345', confirmPassword: 'Test@12345' });
  ok('Duplicate email rejected (409)', !r.body.success && r.status === 409);

  r = await req('POST', '/auth/register', { name: 'Bad', email: 'hacker@gmail.com', password: 'Test@12345', confirmPassword: 'Test@12345' });
  ok('Non-institutional email rejected', !r.body.success);

  r = await req('POST', '/auth/register', { name: 'Mis', email: ('99071A05' + ts + '@example.test'), password: 'Test@12345', confirmPassword: 'Wrong@12345' });
  ok('confirmPassword mismatch rejected', !r.body.success, r.body.message);

  r = await req('POST', '/auth/register', { name: 'Weak', email: ('99071A05' + ts + '@example.test'), password: 'weak', confirmPassword: 'weak' });
  ok('Weak password rejected', !r.body.success, r.body.message);

  console.log('\n=== BUG 4: Add to Cart (productId fix) ===');
  r = await req('POST', '/auth/login', { email: '99071A0501@example.test', password: 'Demo-Student-Only-2026!', expectedRole: 'STUDENT' });
  ok('CSE Student login', r.body.success, r.body.user && r.body.user.name);
  const cseTok = r.body.token;

  await req('DELETE', '/cart', null, cseTok);

  r = await req('POST', '/cart/items', { productId: 1, quantity: 2 }, cseTok);
  ok('Add product 1 (Common) to cart', r.body.success, r.body.message);

  r = await req('POST', '/cart/items', { productId: 4, quantity: 1 }, cseTok);
  ok('Add product 4 (Common) to cart', r.body.success, r.body.message);

  r = await req('GET', '/cart', null, cseTok);
  ok('Cart returns 2 items', r.body.success && r.body.cart.items.length === 2, 'total=Rs.' + (r.body.cart && r.body.cart.totalAmount));
  const cartItems = r.body.cart.items;

  console.log('\n=== BUG 5: Checkout & inventory integrity ===');
  const stocks1 = await db.query('SELECT product_id, stock_quantity FROM Products WHERE product_id IN (1, 4)');
  const before = {};
  stocks1.forEach(s => { before[s.product_id] = s.stock_quantity; });
  console.log('  Stock before: product_1=' + before[1] + ', product_4=' + before[4]);

  r = await req('POST', '/orders/checkout', {
    items: cartItems.map(function(i) { return { productId: i.product.product_id, quantity: i.quantity }; }),
    deliveryLocation: 'CSE Block Ground Floor Room 301',
    paymentMethod: 'CASH_ON_DELIVERY'
  }, cseTok);
  ok('Checkout success', r.body.success, r.body.order ? r.body.order.orderNumber : r.body.message);
  const orderId = r.body.order && r.body.order.orderId;

  const stocks2 = await db.query('SELECT product_id, stock_quantity FROM Products WHERE product_id IN (1, 4)');
  const after = {};
  stocks2.forEach(s => { after[s.product_id] = s.stock_quantity; });
  console.log('  Stock after: product_1=' + after[1] + ', product_4=' + after[4]);

  ok('Stock deducted for product_1 (qty 2)', after[1] === before[1] - 2, before[1] + ' -> ' + after[1]);
  ok('Stock deducted for product_4 (qty 1)', after[4] === before[4] - 1, before[4] + ' -> ' + after[4]);

  r = await req('GET', '/cart', null, cseTok);
  ok('Cart auto-cleared after checkout', r.body.cart && r.body.cart.items.length === 0, 'items=' + (r.body.cart && r.body.cart.items.length));

  if (orderId) {
    const txns = await db.query('SELECT product_id, quantity_change FROM Stock_Transactions WHERE reference_id = ? AND transaction_type = ?', [orderId, 'SALE']);
    ok('Audit log for product_1 in Stock_Transactions', txns.some(function(t) { return t.product_id === 1 && t.quantity_change === -2; }));
    ok('Audit log for product_4 in Stock_Transactions', txns.some(function(t) { return t.product_id === 4 && t.quantity_change === -1; }));
  }

  r = await req('POST', '/cart/items', { productId: 8, quantity: 10000 }, cseTok);
  ok('Oversell at cart add prevented', !r.body.success, r.body.message);

  r = await req('POST', '/orders/checkout', {
    items: [{ productId: 8, quantity: 10000 }],
    deliveryLocation: 'CSE Block Room 301',
    paymentMethod: 'CASH_ON_DELIVERY'
  }, cseTok);
  ok('Oversell at checkout prevented', !r.body.success, r.body.message);

  r = await req('POST', '/cart/items', { productId: 12, quantity: 1 }, cseTok);
  ok('Cross-branch product blocked (CSE -> CSM product)', !r.body.success, r.body.message);

  console.log('\n=== BUG 6: Dev credentials match LoginPage.jsx ===');
  const devCreds = [
    ['admin@example.test', 'Demo-Admin-Only-2026!', 'ADMIN', 'Store Admin'],
    ['demo.agent05@example.test', 'Demo-Agent-Only-2026!', 'DELIVERY_AGENT', 'CSE Agent (05)'],
    ['demo.agent66@example.test', 'Demo-Agent-Only-2026!', 'DELIVERY_AGENT', 'CSM Agent (66)'],
    ['demo.agent67@example.test', 'Demo-Agent-Only-2026!', 'DELIVERY_AGENT', 'CSD Agent (67)'],
    ['99071A0501@example.test', 'Demo-Student-Only-2026!', 'STUDENT', 'CSE Student'],
    ['99071A6605@example.test', 'Demo-Student-Only-2026!', 'STUDENT', 'CSM Student'],
    ['99075A6709@example.test', 'Demo-Student-Only-2026!', 'STUDENT', 'CSD Lateral Student'],
  ];
  for (let i = 0; i < devCreds.length; i++) {
    const email = devCreds[i][0], password = devCreds[i][1], role = devCreds[i][2], label = devCreds[i][3];
    const lr = await req('POST', '/auth/login', { email: email, password: password, expectedRole: role });
    ok('Dev cred: ' + label, lr.body.success && lr.body.user && lr.body.user.role === role, lr.body.user && lr.body.user.name);
  }

  console.log('\n==========================================');
  console.log('FINAL RESULT: ' + pass + ' passed / ' + fail + ' failed');
  process.exit(fail > 0 ? 1 : 0);
})().catch(function(e) {
  console.error('Test error:', e.message);
  process.exit(1);
});
