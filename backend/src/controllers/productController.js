const { query, transaction, getGroupConcatSql } = require('../db/dbAdapter');

/**
 * Get products dynamically filtered by branch and category
 * If student is logged in, strictly enforce their verified branch catalogue
 */
async function getProducts(req, res) {
  try {
    const { categoryId, search, branchId: queryBranchId, includeInactive } = req.query;

    let branchId = null;

    // If a verified student is logged in, their branch is strictly enforced
    if (req.user && req.user.role === 'STUDENT') {
      branchId = req.user.branchId;
    } else if (queryBranchId) {
      branchId = parseInt(queryBranchId, 10);
    }

    const branchCodesCol = getGroupConcatSql('b.branch_code', ', ', 'b.branch_code ASC', false);
    const branchIdsCol = getGroupConcatSql('b.branch_id', ',', 'b.branch_id ASC', true);

    let sql = `
      SELECT p.product_id, p.sku, p.name, p.description, p.category_id,
             p.price, p.stock_quantity, p.reorder_level, p.is_active, p.image_url,
             c.name AS category_name,
             ${branchCodesCol} AS available_branches,
             ${branchIdsCol} AS branch_ids
      FROM Products p
      JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Product_Branches pb ON p.product_id = pb.product_id
      LEFT JOIN Branches b ON pb.branch_id = b.branch_id
    `;

    const whereClauses = [];
    const params = [];

    // Filter inactive products unless requested by admin
    if (includeInactive !== 'true' || !req.user || req.user.role !== 'ADMIN') {
      whereClauses.push('p.is_active = TRUE');
    }

    // Branch filter
    if (branchId) {
      whereClauses.push(`p.product_id IN (
        SELECT product_id FROM Product_Branches WHERE branch_id = ?
      )`);
      params.push(branchId);
    }

    // Category filter
    if (categoryId) {
      whereClauses.push('p.category_id = ?');
      params.push(parseInt(categoryId, 10));
    }

    // Search filter
    if (search && search.trim()) {
      whereClauses.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' GROUP BY p.product_id ORDER BY p.stock_quantity > 0 DESC, p.name ASC';

    const products = await query(sql, params);

    // Format products with formatted branch list
    const formatted = products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      isOutOfStock: p.stock_quantity <= 0,
      isLowStock: p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level,
      branchIds: p.branch_ids ? p.branch_ids.split(',').map(id => parseInt(id, 10)) : []
    }));

    return res.json({ success: true, count: formatted.length, products: formatted });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve products.' });
  }
}

/**
 * Get single product details by ID
 */
async function getProductById(req, res) {
  try {
    const productId = parseInt(req.params.id, 10);

    const branchCodesCol = getGroupConcatSql('b.branch_code', ', ', 'b.branch_code ASC', false);
    const branchIdsCol = getGroupConcatSql('b.branch_id', ',', 'b.branch_id ASC', true);

    const products = await query(
      `SELECT p.product_id, p.sku, p.name, p.description, p.category_id,
              p.price, p.stock_quantity, p.reorder_level, p.is_active, p.image_url,
              c.name AS category_name,
              ${branchCodesCol} AS available_branches,
              ${branchIdsCol} AS branch_ids
       FROM Products p
       JOIN Categories c ON p.category_id = c.category_id
       LEFT JOIN Product_Branches pb ON p.product_id = pb.product_id
       LEFT JOIN Branches b ON pb.branch_id = b.branch_id
       WHERE p.product_id = ?
       GROUP BY p.product_id`,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const p = products[0];

    // If student, check branch permission
    if (req.user && req.user.role === 'STUDENT') {
      const branchIds = p.branch_ids ? p.branch_ids.split(',').map(id => parseInt(id, 10)) : [];
      if (!branchIds.includes(req.user.branchId)) {
        return res.status(403).json({
          success: false,
          message: 'This product is not designated for your university branch.'
        });
      }
    }

    return res.json({
      success: true,
      product: {
        ...p,
        price: parseFloat(p.price),
        isOutOfStock: p.stock_quantity <= 0,
        isLowStock: p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level,
        branchIds: p.branch_ids ? p.branch_ids.split(',').map(id => parseInt(id, 10)) : []
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve product.' });
  }
}

/**
 * Get all product categories
 */
async function getCategories(req, res) {
  try {
    const categories = await query('SELECT category_id, name, description FROM Categories ORDER BY name ASC');
    return res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve categories.' });
  }
}

/**
 * Get all active university branches
 */
async function getBranches(req, res) {
  try {
    const branches = await query(
      'SELECT branch_id, branch_code, branch_name, department_block FROM Branches WHERE is_active = TRUE ORDER BY branch_code ASC'
    );
    return res.json({ success: true, branches });
  } catch (error) {
    console.error('Get branches error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve branches.' });
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  getBranches
};
