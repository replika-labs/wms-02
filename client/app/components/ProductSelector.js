'use client';

import { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function ProductSelector({
  selectedProducts = [],
  onProductChange,
  className = ""
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch products');
        }

        const data = await response.json();

        // Handle both old and new API response formats
        const productsList = data.products || data;
        setProducts(productsList);
      } catch (err) {
        setError('Error loading products: ' + err.message);
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(
      products
        .filter(product => product.category && product.category.trim() !== '')
        .map(product => product.category)
    )].sort();
    return uniqueCategories;
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchLower) ||
        product.code.toLowerCase().includes(searchLower) ||
        (product.description && product.description.toLowerCase().includes(searchLower));

      // Category filter
      const matchesCategory = !selectedCategory || product.category === selectedCategory;

      return matchesSearch && matchesCategory && product.isActive;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'stock':
          aValue = a.qtyOnHand || 0;
          bValue = b.qtyOnHand || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, sortField, sortDirection]);

  // Handle quantity change
  const handleQuantityChange = (productId, quantity) => {
    // Find the product to check stock limits
    const product = products.find(p => p.id === productId);
    const currentStock = product ? product.qtyOnHand : 0;

    // Allow any positive quantity - admin can order any amount regardless of stock
    const validQuantity = Math.max(0, quantity);

    if (onProductChange) {
      onProductChange(productId, validQuantity, currentStock); // Pass current stock for reference
    }
  };

  // Toggle sort direction for the same field
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get current quantity for a product
  const getCurrentQuantity = (productId) => {
    const selected = selectedProducts.find(p => p.productId === productId);
    return selected ? selected.quantity : 0;
  };

  // Render sort button
  const SortButton = ({ field, children }) => {
    const isActive = sortField === field;
    const isAsc = sortDirection === 'asc';

    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${isActive
          ? 'bg-blue-100 text-blue-800 border border-blue-200'
          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
      >
        {children}
        {isActive && (
          isAsc ? (
            <ChevronUpIcon className="ml-1 h-3 w-3" />
          ) : (
            <ChevronDownIcon className="ml-1 h-3 w-3" />
          )
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="grid grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* PROMINENT SUMMARY SECTION */}
      {selectedProducts.length > 0 && (() => {
        // Calculate products that will need material restocking (quantity > current stock)
        const productsNeedingMaterial = selectedProducts.filter(sp => {
          const product = products.find(p => p.id === sp.productId);
          return product && sp.quantity > product.qtyOnHand;
        });

        return (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📦</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Selected Products Summary</h3>
                  <div className="flex items-center space-x-4 mt-1 flex-wrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Selected Products: {selectedProducts.length} items 
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Total Quantity: {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} pcs
                    </span>
                    {productsNeedingMaterial.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        📦 May Need Material: {productsNeedingMaterial.length} products
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)}
                </div>
                <div className="text-sm text-blue-500">Total Pcs</div>
                {productsNeedingMaterial.length > 0 && (
                  <div className="text-sm text-orange-600 font-medium mt-1">
                    Material check needed
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search and Filter Controls */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort:</label>
            <div className="flex space-x-1">
              <SortButton field="name">Name</SortButton>
              <SortButton field="price">Price</SortButton>
              <SortButton field="stock">Stock</SortButton>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        {filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredAndSortedProducts.map((product) => {
                const currentQuantity = getCurrentQuantity(product.id);
                const isSelected = currentQuantity > 0;

                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-3 transition-all duration-200 flex flex-col ${isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    {/* Product Info */}
                    <div className="flex-1 space-y-1 mb-3">
                      <h4 className="font-medium text-sm text-gray-900 leading-tight line-clamp-2">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {product.code}
                      </p>
                      {product.category && (
                        <p className="text-xs text-blue-600 font-medium">
                          {product.category}
                        </p>
                      )}
                      {product.price && (
                        <p className="text-xs text-green-600 font-medium">
                          IDR {product.price.toLocaleString('id-ID')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Stock: {product.qtyOnHand} {product.unit}
                      </p>
                      {product.baseMaterial && (
                        <p className="text-xs text-purple-600 truncate" title={`Material: ${product.baseMaterial.name}`}>
                          Material: {product.baseMaterial.name}
                        </p>
                      )}
                    </div>

                    {/* Quantity Input Section */}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="text-xs text-gray-600 flex-shrink-0">Qty:</label>
                        <input
                          type="number"
                          min="0"
                          value={currentQuantity}
                          onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-0"
                          placeholder="0"
                        />
                      </div>

                      {/* Status Indicators */}
                      {isSelected && (
                        <div className="flex items-center justify-center">
                          {product.qtyOnHand === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              📦 Out of Stock - Will Need Material
                            </span>
                          ) : currentQuantity > product.qtyOnHand ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              📦 May Need Additional Material
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ✓ Selected: {currentQuantity} pcs
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 