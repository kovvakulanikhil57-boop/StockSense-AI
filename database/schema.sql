-- ==============================================================================
-- StockSense AI: University Stationery Store and Delivery Management System
-- Database Schema (MySQL 8.0+ / MariaDB 10.5+)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS stocksense_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stocksense_db;

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS Branches (
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_code VARCHAR(10) NOT NULL UNIQUE,
    branch_name VARCHAR(120) NOT NULL,
    department_block VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'DELIVERY_AGENT', 'ADMIN') NOT NULL,
    branch_id INT NULL,
    phone VARCHAR(25) NULL,
    vehicle_number VARCHAR(50) NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES Branches(branch_id) ON DELETE SET NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_branch (branch_id)
) ENGINE=InnoDB;

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Products Table
CREATE TABLE IF NOT EXISTS Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    category_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reorder_level INT NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    image_url VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES Categories(category_id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_active_stock (is_active, stock_quantity)
) ENGINE=InnoDB;

-- 5. Product_Branches (Many-to-Many dynamic catalogue configuration)
CREATE TABLE IF NOT EXISTS Product_Branches (
    product_id INT NOT NULL,
    branch_id INT NOT NULL,
    PRIMARY KEY (product_id, branch_id),
    CONSTRAINT fk_pb_product FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_pb_branch FOREIGN KEY (branch_id) REFERENCES Branches(branch_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Suppliers Table
CREATE TABLE IF NOT EXISTS Suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    contact_person VARCHAR(120) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Purchases Table (Stock Inflow from Suppliers)
CREATE TABLE IF NOT EXISTS Purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    invoice_number VARCHAR(100) NULL,
    purchase_date DATE NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    notes TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id),
    CONSTRAINT fk_purchases_creator FOREIGN KEY (created_by) REFERENCES Users(user_id),
    INDEX idx_purchases_date (purchase_date)
) ENGINE=InnoDB;

-- 8. Purchase_Items Table
CREATE TABLE IF NOT EXISTS Purchase_Items (
    purchase_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    cost_price DECIMAL(10, 2) NOT NULL CHECK (cost_price >= 0),
    line_total DECIMAL(12, 2) NOT NULL CHECK (line_total >= 0),
    CONSTRAINT fk_pi_purchase FOREIGN KEY (purchase_id) REFERENCES Purchases(purchase_id) ON DELETE CASCADE,
    CONSTRAINT fk_pi_product FOREIGN KEY (product_id) REFERENCES Products(product_id),
    INDEX idx_pi_purchase (purchase_id),
    INDEX idx_pi_product (product_id)
) ENGINE=InnoDB;

-- 9. Orders Table
CREATE TABLE IF NOT EXISTS Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(40) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    branch_id INT NOT NULL,
    delivery_location VARCHAR(200) NOT NULL,
    order_status ENUM('PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    payment_status ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    payment_method ENUM('CASH_ON_DELIVERY', 'SIMULATED_ONLINE') NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    cancellation_reason TEXT NULL,
    is_stock_restored BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_student FOREIGN KEY (student_id) REFERENCES Users(user_id),
    CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES Branches(branch_id),
    INDEX idx_orders_student (student_id),
    INDEX idx_orders_branch (branch_id),
    INDEX idx_orders_status (order_status),
    INDEX idx_orders_created (created_at)
) ENGINE=InnoDB;

-- 10. Order_Items Table (Historical snapshot of prices and quantities)
CREATE TABLE IF NOT EXISTS Order_Items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(10, 2) NOT NULL CHECK (line_total >= 0),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES Products(product_id),
    INDEX idx_oi_order (order_id),
    INDEX idx_oi_product (product_id)
) ENGINE=InnoDB;

-- 11. Deliveries Table
CREATE TABLE IF NOT EXISTS Deliveries (
    delivery_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    agent_id INT NULL,
    assignment_status ENUM('UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'DECLINED', 'DISPATCHED', 'DELIVERED') NOT NULL DEFAULT 'ASSIGNED',
    accepted_at DATETIME NULL,
    dispatched_at DATETIME NULL,
    delivered_at DATETIME NULL,
    otp_hash VARCHAR(255) NULL,
    otp_encrypted_student TEXT NULL,
    otp_expires_at DATETIME NULL,
    failed_attempt_count INT NOT NULL DEFAULT 0,
    decline_reason TEXT NULL,
    delivery_duration_minutes INT NULL,
    is_delayed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_deliveries_order FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_deliveries_agent FOREIGN KEY (agent_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    INDEX idx_deliveries_agent (agent_id),
    INDEX idx_deliveries_status (assignment_status),
    INDEX idx_deliveries_delayed (is_delayed)
) ENGINE=InnoDB;

-- 12. Agent_Warnings Table
CREATE TABLE IF NOT EXISTS Agent_Warnings (
    warning_id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    order_id INT NULL,
    delivery_id INT NULL,
    issued_by INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('ACTIVE', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    resolution_notes TEXT NULL,
    CONSTRAINT fk_aw_agent FOREIGN KEY (agent_id) REFERENCES Users(user_id),
    CONSTRAINT fk_aw_order FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE SET NULL,
    CONSTRAINT fk_aw_delivery FOREIGN KEY (delivery_id) REFERENCES Deliveries(delivery_id) ON DELETE SET NULL,
    CONSTRAINT fk_aw_issuer FOREIGN KEY (issued_by) REFERENCES Users(user_id),
    INDEX idx_aw_agent (agent_id),
    INDEX idx_aw_status (status)
) ENGINE=InnoDB;

-- 13. Stock_Transactions Table (Audit log for every inventory movement)
CREATE TABLE IF NOT EXISTS Stock_Transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type ENUM('PURCHASE', 'SALE', 'CANCELLATION_RESTOCK', 'ADJUSTMENT') NOT NULL,
    quantity_change INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_type ENUM('ORDER', 'PURCHASE', 'MANUAL_ADJUSTMENT') NOT NULL,
    reference_id INT NULL,
    notes VARCHAR(255) NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_st_product FOREIGN KEY (product_id) REFERENCES Products(product_id),
    CONSTRAINT fk_st_user FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE SET NULL,
    INDEX idx_st_product (product_id),
    INDEX idx_st_created (created_at),
    INDEX idx_st_ref (reference_type, reference_id)
) ENGINE=InnoDB;

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('ORDER', 'DELIVERY', 'WARNING', 'INVENTORY', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB;

-- 15. Carts Table (Isolated student cart)
CREATE TABLE IF NOT EXISTS Carts (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_carts_student FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_carts_student (student_id)
) ENGINE=InnoDB;

-- 16. Cart_Items Table
CREATE TABLE IF NOT EXISTS Cart_Items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ci_cart FOREIGN KEY (cart_id) REFERENCES Carts(cart_id) ON DELETE CASCADE,
    CONSTRAINT fk_ci_product FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
    UNIQUE KEY uk_cart_product (cart_id, product_id),
    INDEX idx_ci_cart (cart_id),
    INDEX idx_ci_product (product_id)
) ENGINE=InnoDB;

