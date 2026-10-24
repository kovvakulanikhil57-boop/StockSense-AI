import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  BookOpen,
  MapPin,
  ArrowUpDown
} from 'lucide-react';

export default function StudentStorefront() {
  const { user, isAuthenticated, branchCode, branchName } = useAuth();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [catsRes, prodsRes] = await Promise.all([
          api.products.getCategories(),
          api.products.getAll({
            categoryId: selectedCategory || undefined,
            search: searchQuery || undefined
          })
        ]);

        if (catsRes.success) setCategories(catsRes.categories || []);
        if (prodsRes.success) setProducts(prodsRes.products || []);
      } catch (err) {
        console.error('Failed to load store data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory, searchQuery, user?.branchId]);

  const handleQtyChange = (productId, delta, maxStock) => {
    const current = quantities[productId] || 1;
    const updated = Math.max(1, Math.min(maxStock, current + delta));
    setQuantities(prev => ({ ...prev, [productId]: updated }));
  };

  const getBranchBadge = (product) => {
    const branches = product.available_branches || '';
    const isCommon = branches.includes('05') && branches.includes('66') && branches.includes('67');

    if (isCommon) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
          Common University Supply
        </span>
      );
    }
    if (branches.includes('05')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-blue-800 border border-blue-200">
          CSE (05) Specific
        </span>
      );
    }
    if (branches.includes('66')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-purple-50 text-purple-800 border border-purple-200">
          CSM (66) Specific
        </span>
      );
    }
    if (branches.includes('67')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-teal-50 text-teal-800 border border-teal-200">
          CSD (67) Specific
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-sky-50 text-sky-800 border border-sky-200">
        Branch: {branches}
      </span>
    );
  };

  // Sorted product list
  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === 'price-low') {
      return list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    }
    if (sortBy === 'price-high') {
      return list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }
    if (sortBy === 'name-asc') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [products, sortBy]);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white p-6 sm:p-10 shadow-xl border border-navy-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-sky-500/10 to-transparent pointer-events-none"></div>
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official University Stationery Portal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Curated Academic Supplies & Fast Department Delivery
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Lab record books, observation manuals, executive bond papers, and precision engineering tools mapped dynamically to your verified academic branch.
          </p>

          {/* Student's Verified Branch Card */}
          {isAuthenticated && user?.branchName && (
            <div className="mt-4 pt-4 border-t border-navy-800/80 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-400">Your Verified Branch:</span>
              <span className="px-3 py-1 rounded-lg bg-sky-400/20 text-sky-200 font-bold border border-sky-400/30">
                {user.branchName} ({user.branchCode})
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{user.departmentBlock}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter, Search & Sorting Bar */}
      <div className="space-y-4">
        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-navy-900 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All Stationery
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setSelectedCategory(c.category_id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c.category_id
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Search and Sort Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, or keyword..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-600/10 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-navy-600 outline-none shadow-sm cursor-pointer"
            >
              <option value="featured">Featured / Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-asc">Product Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="h-5 bg-slate-200 rounded w-4/5"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-12 bg-slate-200 rounded w-full"></div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-5 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="h-9 bg-slate-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No products matched your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your search query or selecting another category from the filter list above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
          {sortedProducts.map((product) => {
            const qty = quantities[product.product_id] || 1;
            const isOutOfStock = product.stock_quantity <= 0;
            const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.reorder_level;

            return (
              <div
                key={product.product_id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-navy-300 p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 group"
              >
                {/* Top Section: Category & SKU */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {product.category_name}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                      SKU: {product.sku}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3
                    className="font-extrabold text-navy-950 text-base leading-snug line-clamp-2 min-h-[2.5rem]"
                    title={product.name}
                  >
                    {product.name}
                  </h3>

                  {/* Branch Availability Badge */}
                  <div>
                    {getBranchBadge(product)}
                  </div>

                  {/* Product Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed min-h-[3.25rem]">
                    {product.description || 'Academic course supply and stationery material verified for university departments.'}
                  </p>
                </div>

                {/* Bottom Section: Stock Status, Price, Stepper & Button */}
                <div className="pt-4 mt-4 border-t border-slate-100 space-y-3.5">
                  {/* Stock Status & Price Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Stock Status Indicator */}
                    <div>
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Low Stock ({product.stock_quantity})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          In Stock ({product.stock_quantity})
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <span className="text-lg font-black text-navy-950">
                        ₹{parseFloat(product.price).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Add to Cart Action */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isOutOfStock && (
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.product_id, -1, product.stock_quantity)}
                          className="px-2.5 py-2 text-slate-600 hover:bg-slate-200 transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800 min-w-[1.75rem] text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.product_id, 1, product.stock_quantity)}
                          disabled={qty >= product.stock_quantity}
                          className="px-2.5 py-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product, qty)}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                        isOutOfStock
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'bg-navy-900 hover:bg-navy-800 text-white hover:shadow-md'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
