const { query, transaction } = require('../db/dbAdapter');

/**
 * Helper to retrieve or lazily create a cart for an authenticated student
 */
async function getOrCreateCart(connection, studentId) {
  const [rows] = await connection.execute(
    'SELECT cart_id FROM Carts WHERE student_id = ?',
    [studentId]
  );

  if (rows.length > 0) {
    return rows[0].cart_id;
  }

  const [insert] = await connection.execute(
    'INSERT INTO Carts (student_id) VALUES (?)',
    [studentId]
  );
  return insert.insertId;
}

/**
 * Get the authenticated student's isolated cart
 */
async function getCart(req, res) {
  try {
    const studentId = req.user.userId;
    const branchId = req.user.branchId;

    const cartResult = await transaction(async (connection) => {
      const cartId = await getOrCreateCart(connection, studentId);

      // Fetch items joined with product and branch validity check
      const [items] = await connection.execute(
        `SELECT ci.cart_item_id, ci.product_id, ci.quantity,
                p.sku, p.name, p.description, p.price, p.stock_quantity, p.reorder_level, p.is_active,
                c.name AS category_name,
                (SELECT COUNT(*) FROM Product_Branches pb WHERE pb.product_id = p.product_id AND pb.branch_id = ?) AS is_branch_eligible
         FROM Cart_Items ci
         JOIN Products p ON ci.product_id = p.product_id
         JOIN Categories c ON p.category_id = c.category_id
         WHERE ci.cart_id = ?
         ORDER BY ci.created_at ASC`,
        [branchId, cartId]
      );

      let totalItems = 0;
      let totalAmount = 0;

      const formattedItems = items.map(item => {
        const price = parseFloat(item.price);
        const lineTotal = price * item.quantity;
        const isAvailable = Boolean(item.is_active) && Boolean(item.is_branch_eligible) && item.stock_quantity > 0;
        const isSufficient = item.stock_quantity >= item.quantity;

        totalItems += item.quantity;
        totalAmount += lineTotal;

        return {
          cartItemId: item.cart_item_id,
          product: {
            product_id: item.product_id,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price,
            stock_quantity: item.stock_quantity,
            reorder_level: item.reorder_level,
            is_active: Boolean(item.is_active),
            category_name: item.category_name,
            isOutOfStock: item.stock_quantity <= 0,
            isBranchEligible: Boolean(item.is_branch_eligible)
          },
          quantity: item.quantity,
          unitPrice: price,
          lineTotal,
          isAvailable,
          isSufficient
        };
      });

      return {
        cartId,
        studentId,
        items: formattedItems,
        totalItems,
        totalAmount
      };
    });

    return res.json({
      success: true,
      cart: cartResult
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve cart.' });
  }
}

/**
 * Add an item to the student's cart with branch & stock re-validation
 */
async function addItem(req, res) {
  try {
    const studentId = req.user.userId;
    const branchId = req.user.branchId;
    const { productId, quantity = 1 } = req.body;

    const prodId = parseInt(productId, 10);
    const addQty = parseInt(quantity, 10);

    if (isNaN(prodId) || isNaN(addQty) || addQty <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product or quantity specified.' });
    }

    const result = await transaction(async (connection) => {
      // 1. Re-validate product status & branch eligibility
      const [prods] = await connection.execute(
        `SELECT p.product_id, p.name, p.price, p.stock_quantity, p.is_active,
                (SELECT COUNT(*) FROM Product_Branches pb WHERE pb.product_id = p.product_id AND pb.branch_id = ?) AS is_branch_eligible
         FROM Products p
         WHERE p.product_id = ?`,
        [branchId, prodId]
      );

      if (prods.length === 0 || !prods[0].is_active) {
        throw new Error('This product is currently unavailable.');
      }

      const product = prods[0];

      if (!product.is_branch_eligible) {
        throw new Error(`Product '${product.name}' is not authorized for your university branch.`);
      }

      if (product.stock_quantity <= 0) {
        throw new Error(`'${product.name}' is currently out of stock.`);
      }

      const cartId = await getOrCreateCart(connection, studentId);

      // Check current item quantity in student's cart
      const [existing] = await connection.execute(
        'SELECT cart_item_id, quantity FROM Cart_Items WHERE cart_id = ? AND product_id = ?',
        [cartId, prodId]
      );

      const currentQty = existing.length > 0 ? existing[0].quantity : 0;
      const targetQty = currentQty + addQty;

      if (targetQty > product.stock_quantity) {
        throw new Error(
          `Only ${product.stock_quantity} units of '${product.name}' are currently available.`
        );
      }

      if (existing.length > 0) {
        await connection.execute(
          'UPDATE Cart_Items SET quantity = ? WHERE cart_item_id = ?',
          [targetQty, existing[0].cart_item_id]
        );
      } else {
        await connection.execute(
          'INSERT INTO Cart_Items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
          [cartId, prodId, targetQty]
        );
      }

      return { productName: product.name, quantity: targetQty };
    });

    return res.status(200).json({
      success: true,
      message: `Added '${result.productName}' to your cart.`,
      result
    });
  } catch (error) {
    console.error('Add item error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Update item quantity in student's cart
 */
async function updateItemQuantity(req, res) {
  try {
    const studentId = req.user.userId;
    const branchId = req.user.branchId;
    const prodId = parseInt(req.params.productId, 10);
    const newQty = parseInt(req.body.quantity, 10);

    if (isNaN(prodId) || isNaN(newQty)) {
      return res.status(400).json({ success: false, message: 'Invalid product or quantity.' });
    }

    const result = await transaction(async (connection) => {
      const cartId = await getOrCreateCart(connection, studentId);

      if (newQty <= 0) {
        await connection.execute(
          'DELETE FROM Cart_Items WHERE cart_id = ? AND product_id = ?',
          [cartId, prodId]
        );
        return { removed: true, quantity: 0 };
      }

      // Check stock availability
      const [prods] = await connection.execute(
        'SELECT product_id, name, stock_quantity, is_active FROM Products WHERE product_id = ?',
        [prodId]
      );

      if (prods.length === 0 || !prods[0].is_active) {
        await connection.execute(
          'DELETE FROM Cart_Items WHERE cart_id = ? AND product_id = ?',
          [cartId, prodId]
        );
        throw new Error('This product is no longer available and was removed from your cart.');
      }

      if (newQty > prods[0].stock_quantity) {
        throw new Error(
          `Only ${prods[0].stock_quantity} units of '${prods[0].name}' are currently available.`
        );
      }

      await connection.execute(
        'UPDATE Cart_Items SET quantity = ? WHERE cart_id = ? AND product_id = ?',
        [newQty, cartId, prodId]
      );

      return { removed: false, quantity: newQty };
    });

    return res.json({
      success: true,
      message: result.removed ? 'Item removed from cart.' : 'Cart quantity updated.',
      result
    });
  } catch (error) {
    console.error('Update item quantity error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Remove an item from the student's cart
 */
async function removeItem(req, res) {
  try {
    const studentId = req.user.userId;
    const prodId = parseInt(req.params.productId, 10);

    await transaction(async (connection) => {
      const cartId = await getOrCreateCart(connection, studentId);
      await connection.execute(
        'DELETE FROM Cart_Items WHERE cart_id = ? AND product_id = ?',
        [cartId, prodId]
      );
    });

    return res.json({ success: true, message: 'Item removed from cart.' });
  } catch (error) {
    console.error('Remove item error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove item.' });
  }
}

/**
 * Clear the authenticated student's cart
 */
async function clearCart(req, res) {
  try {
    const studentId = req.user.userId;

    await transaction(async (connection) => {
      const cartId = await getOrCreateCart(connection, studentId);
      await connection.execute('DELETE FROM Cart_Items WHERE cart_id = ?', [cartId]);
    });

    return res.json({ success: true, message: 'Cart cleared successfully.' });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
}

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart
};
