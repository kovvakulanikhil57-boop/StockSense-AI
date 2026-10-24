-- ==============================================================================
-- StockSense AI: Cart Database Migration
-- Adds Carts and Cart_Items tables for student cart isolation
-- ==============================================================================

USE stocksense_db;

-- 1. Create Carts Table (One cart per student)
CREATE TABLE IF NOT EXISTS Carts (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_carts_student FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_carts_student (student_id)
) ENGINE=InnoDB;

-- 2. Create Cart_Items Table
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
