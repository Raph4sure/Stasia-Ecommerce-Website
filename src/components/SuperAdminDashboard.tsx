import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  ArrowUpDown,
  Search,
  Filter,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Eye,
  EyeOff,
  Calendar,
  X,
  RefreshCw,
  ShoppingBag,
  Clock,
  DollarSign,
  Layers,
  ChevronDown,
  Scale,
  KeyRound,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Product, Sale, User } from '../types';
import { formatPrice, formatDateTime, fetchWithAuth } from '../lib/api';

interface SuperAdminDashboardProps {
  currentUser: User;
  products: Product[];
  categories: { category: string; isAvailable: boolean }[];
  sales: Sale[];
  salesSummary: { totalRevenue: number; totalUnitsSold: number; transactionsCount: number };
  onRefreshData: () => Promise<void>;
  onSwitchToPos: () => void;
}

type TabType = 'inventory' | 'sales' | 'staff' | 'categories';

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentUser,
  products,
  categories,
  sales,
  salesSummary,
  onRefreshData,
  onSwitchToPos,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');

  // Inventory Table State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'in_stock' | 'out_of_stock'>('all');
  const [sortField, setSortField] = useState<'title' | 'price' | 'quantity' | 'category' | 'subtotal' | 'weight' | 'totalWeight'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Inline editing state: productId -> { price, quantity, weight }
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editWeight, setEditWeight] = useState<string>('');
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Upload / Edit Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [targetProductId, setTargetProductId] = useState<number | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formCodeNo, setFormCodeNo] = useState('');
  const [formCategory, setFormCategory] = useState('Clothes');
  const [formPriceDollars, setFormPriceDollars] = useState('');
  const [formQuantity, setFormQuantity] = useState('10');
  const [formWeight, setFormWeight] = useState('0.50');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formImageUrls, setFormImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
  ]);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sales Log filters
  const [salesTimeframe, setSalesTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'annually' | 'custom'>('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesSortBy, setSalesSortBy] = useState<'timestamp' | 'quantity' | 'price'>('timestamp');
  const [salesSortOrder, setSalesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesErrorMsg, setSalesErrorMsg] = useState<string | null>(null);
  const [localSalesList, setLocalSalesList] = useState<Sale[]>(sales);
  const [localSalesSummary, setLocalSalesSummary] = useState(salesSummary);

  // Sync sales props whenever updated from parent
  useEffect(() => {
    if (sales) {
      setLocalSalesList(sales);
    }
    if (salesSummary) {
      setLocalSalesSummary(salesSummary);
    }
  }, [sales, salesSummary]);

  // Staff creation & management state
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [staffSuccessMsg, setStaffSuccessMsg] = useState<string | null>(null);
  const [staffErrorMsg, setStaffErrorMsg] = useState<string | null>(null);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Password reset state for staff
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState(false);

  // Load sales when filters change
  const fetchFilteredSales = async (
    timeframe = salesTimeframe,
    sortBy = salesSortBy,
    sortDir = salesSortOrder,
    start = customStartDate,
    end = customEndDate
  ) => {
    setIsLoadingSales(true);
    setSalesErrorMsg(null);
    try {
      let query = `/api/sales?timeframe=${timeframe}&sortBy=${sortBy}&sortOrder=${sortDir}`;
      if (timeframe === 'custom' && start) {
        query += `&startDate=${encodeURIComponent(start)}`;
        if (end) query += `&endDate=${encodeURIComponent(end)}`;
      }
      const data = await fetchWithAuth(query);
      setLocalSalesList(data.sales || []);
      setLocalSalesSummary(data.summary || { totalRevenue: 0, totalUnitsSold: 0, transactionsCount: 0 });
    } catch (err: any) {
      console.warn('Notice loading sales log:', err.message);
      setSalesErrorMsg(err.message || 'Unable to load sales log.');
    } finally {
      setIsLoadingSales(false);
    }
  };

  // Load staff list
  const fetchStaff = async () => {
    setIsLoadingStaff(true);
    setStaffErrorMsg(null);
    try {
      const data = await fetchWithAuth('/api/auth/admins');
      setStaffList(data || []);
    } catch (err: any) {
      console.warn('Notice loading staff list:', err.message);
      setStaffErrorMsg(err.message || 'Unable to load staff list.');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Auto-fetch data on activeTab switch if not yet loaded
  useEffect(() => {
    if (activeTab === 'staff' && staffList.length === 0 && !isLoadingStaff) {
      fetchStaff();
    } else if (activeTab === 'sales' && localSalesList.length === 0 && !isLoadingSales) {
      fetchFilteredSales();
    }
  }, [activeTab]);

  // Handle inline edit click
  const startInlineEdit = (p: Product) => {
    setEditingId(p.id);
    setEditPrice((p.pricePerUnit / 100).toFixed(2));
    setEditQuantity(String(p.quantityInStock));
    setEditWeight(String(p.weightPerUnit !== undefined ? p.weightPerUnit : 0));
  };

  const saveInlineEdit = async (productId: number) => {
    setIsSavingInline(true);
    try {
      const priceCents = Math.round(parseFloat(editPrice || '0') * 100);
      const qty = parseInt(editQuantity || '0', 10);
      const weight = Math.max(0, parseFloat(editWeight || '0'));

      await fetchWithAuth(`/api/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          pricePerUnit: priceCents,
          quantityInStock: qty,
          weightPerUnit: weight,
        }),
      });

      await onRefreshData();
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    } finally {
      setIsSavingInline(false);
    }
  };

  // Toggle single product availability
  const toggleProductAvailability = async (productId: number, currentVal: boolean) => {
    try {
      await fetchWithAuth(`/api/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !currentVal }),
      });
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle product visibility');
    }
  };

  // Toggle Category Availability
  const toggleCategoryAvailability = async (catName: string, currentVal: boolean) => {
    try {
      await fetchWithAuth(`/api/categories/${encodeURIComponent(catName)}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !currentVal }),
      });
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle category availability');
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    try {
      await fetchWithAuth(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setTargetProductId(null);
    setFormTitle('');
    // Auto-generate code like CLT-823
    const prefix = 'BTQ';
    const randNum = Math.floor(100 + Math.random() * 900);
    setFormCodeNo(`${prefix}-${randNum}`);
    setFormCategory('Clothes');
    setFormPriceDollars('120.00');
    setFormQuantity('12');
    setFormWeight('0.50');
    setFormIsAvailable(true);
    setFormImageUrls([
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    ]);
    setFormError(null);
    setIsUploadModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p: Product) => {
    setModalMode('edit');
    setTargetProductId(p.id);
    setFormTitle(p.title);
    setFormCodeNo(p.codeNo);
    setFormCategory(p.category);
    setFormPriceDollars((p.pricePerUnit / 100).toFixed(2));
    setFormQuantity(String(p.quantityInStock));
    setFormWeight(String(p.weightPerUnit !== undefined ? p.weightPerUnit : 0));
    setFormIsAvailable(p.isAvailable);
    setFormImageUrls(p.images.length > 0 ? p.images : ['']);
    setFormError(null);
    setIsUploadModalOpen(true);
  };

  // Handle Form Submit (Create or Update Product)
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingForm(true);
    setFormError(null);

    try {
      const priceCents = Math.round(parseFloat(formPriceDollars || '0') * 100);
      const qty = parseInt(formQuantity || '0', 10);
      const weight = Math.max(0, parseFloat(formWeight || '0'));
      const validImages = formImageUrls.filter((url) => url.trim().length > 0);

      const payload = {
        title: formTitle,
        codeNo: formCodeNo,
        category: formCategory,
        pricePerUnit: priceCents,
        quantityInStock: qty,
        weightPerUnit: weight,
        isAvailable: formIsAvailable,
        images: validImages,
      };

      if (modalMode === 'create') {
        await fetchWithAuth('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchWithAuth(`/api/products/${targetProductId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      await onRefreshData();
      setIsUploadModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Create Staff Form Submit
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingStaff(true);
    setStaffErrorMsg(null);
    setStaffSuccessMsg(null);

    try {
      await fetchWithAuth('/api/auth/create-admin', {
        method: 'POST',
        body: JSON.stringify({
          email: newStaffEmail,
          password: newStaffPassword,
          role: newStaffRole,
        }),
      });

      setStaffSuccessMsg(`Staff account for ${newStaffEmail} created successfully!`);
      setNewStaffEmail('');
      setNewStaffPassword('');
      fetchStaff();
    } catch (err: any) {
      setStaffErrorMsg(err.message || 'Failed to create staff account');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Delete Staff handler
  const handleDeleteStaff = async (userId: number, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete the staff account "${email}"? This action cannot be undone.`)) {
      return;
    }
    setStaffErrorMsg(null);
    setStaffSuccessMsg(null);
    try {
      await fetchWithAuth(`/api/auth/admins/${userId}`, {
        method: 'DELETE',
      });
      setStaffSuccessMsg(`Staff account "${email}" was deleted successfully.`);
      fetchStaff();
    } catch (err: any) {
      setStaffErrorMsg(err.message || 'Failed to delete staff account');
    }
  };

  // Reset Staff Password handler
  const handleResetPasswordSubmit = async (userId: number) => {
    if (!resetNewPassword || resetNewPassword.trim().length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setIsSubmittingPasswordReset(true);
    setStaffErrorMsg(null);
    setStaffSuccessMsg(null);
    try {
      await fetchWithAuth(`/api/auth/admins/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: resetNewPassword.trim() }),
      });
      setStaffSuccessMsg(`Password successfully updated for user #${userId}.`);
      setResettingUserId(null);
      setResetNewPassword('');
    } catch (err: any) {
      setStaffErrorMsg(err.message || 'Failed to update password');
    } finally {
      setIsSubmittingPasswordReset(false);
    }
  };

  // Toggle Staff Role handler
  const handleToggleStaffRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN';
    setStaffErrorMsg(null);
    setStaffSuccessMsg(null);
    try {
      await fetchWithAuth(`/api/auth/admins/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setStaffSuccessMsg(`Role updated to ${newRole} for user #${userId}.`);
      fetchStaff();
    } catch (err: any) {
      setStaffErrorMsg(err.message || 'Failed to change staff role');
    }
  };

  // Filtered and Sorted Products for Inventory Table
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (categoryFilter !== 'All' && p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
        if (stockFilter === 'low' && (p.quantityInStock >= 5 || p.quantityInStock <= 0)) {
          return false;
        }
        if (stockFilter === 'out_of_stock' && p.quantityInStock > 0) {
          return false;
        }
        if (stockFilter === 'in_stock' && p.quantityInStock <= 0) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchCode = p.codeNo.toLowerCase().includes(q);
          if (!matchTitle && !matchCode) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'title') {
          diff = a.title.localeCompare(b.title);
        } else if (sortField === 'price') {
          diff = a.pricePerUnit - b.pricePerUnit;
        } else if (sortField === 'quantity') {
          diff = a.quantityInStock - b.quantityInStock;
        } else if (sortField === 'category') {
          diff = a.category.localeCompare(b.category);
        } else if (sortField === 'subtotal') {
          const subA = a.pricePerUnit * a.quantityInStock;
          const subB = b.pricePerUnit * b.quantityInStock;
          diff = subA - subB;
        } else if (sortField === 'weight') {
          diff = (a.weightPerUnit || 0) - (b.weightPerUnit || 0);
        } else if (sortField === 'totalWeight') {
          const totA = (a.weightPerUnit || 0) * a.quantityInStock;
          const totB = (b.weightPerUnit || 0) * b.quantityInStock;
          diff = totA - totB;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [products, categoryFilter, stockFilter, searchTerm, sortField, sortOrder]);

  // Calculated Grand Totals for Table Footer
  const finalGrandTotal = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.pricePerUnit * p.quantityInStock, 0);
  }, [filteredProducts]);

  const totalFilteredUnits = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.quantityInStock, 0);
  }, [filteredProducts]);

  const totalFilteredWeight = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + (p.weightPerUnit || 0) * p.quantityInStock, 0);
  }, [filteredProducts]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.quantityInStock > 0 && p.quantityInStock < 5).length;
  }, [products]);

  return (
    <div id="super-admin-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 px-2 py-0.5 rounded font-semibold uppercase">
              Super Admin Console
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">Logged in: {currentUser.email}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50">
            Stasia Elegant Fabrigue • Executive Terminal
          </h1>
        </div>

        {/* Action button to switch to POS Register, Manage Staff, Upload New Item */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            id="btn-switch-to-pos"
            onClick={onSwitchToPos}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Launch POS Register</span>
          </button>

          <button
            id="btn-header-manage-staff"
            onClick={() => {
              setActiveTab('staff');
              fetchStaff();
            }}
            className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition"
          >
            <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Manage Staff</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-stone-900 dark:bg-amber-500 hover:bg-stone-800 dark:hover:bg-amber-400 text-stone-100 dark:text-stone-950 font-medium text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4 text-amber-400 dark:text-stone-950" />
            <span>Upload New Item</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 mb-8 overflow-x-auto scrollbar-none pb-1">
        <button
          id="tab-btn-inventory"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'border-amber-600 text-stone-900 dark:text-stone-50 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:border-stone-300 dark:hover:border-stone-700'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Interactive Inventory Table</span>
          {lowStockCount > 0 && (
            <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-mono font-medium">
              {lowStockCount} Low
            </span>
          )}
        </button>

        <button
          id="tab-btn-sales"
          onClick={() => {
            setActiveTab('sales');
            fetchFilteredSales();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === 'sales'
              ? 'border-amber-600 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Global Sales Logs</span>
        </button>

        <button
          id="tab-btn-staff"
          onClick={() => {
            setActiveTab('staff');
            fetchStaff();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === 'staff'
              ? 'border-amber-600 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Access Management</span>
        </button>

        <button
          id="tab-btn-categories"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-amber-600 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Public Category Visibility</span>
        </button>
      </div>

      {/* ================= TAB 1: INVENTORY TABLE ================= */}
      {activeTab === 'inventory' && (
        <div id="inventory-tab-content" className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500">Total Catalog Items</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-1">
                {products.length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500">Units in Stock</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-1">
                {products.reduce((a, b) => a + b.quantityInStock, 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500">Total Inventory Valuation</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-800 mt-1">
                {formatPrice(products.reduce((a, b) => a + b.pricePerUnit * b.quantityInStock, 0))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500">Low Stock Alert (&lt; 5)</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 mt-1 flex items-center gap-1.5">
                {lowStockCount > 0 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <span>{lowStockCount} items</span>
                  </>
                ) : (
                  <span>Healthy (0)</span>
                )}
              </div>
            </div>
          </div>

          {/* Filtering & Sorting Controls */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Search input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter name or Code No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Category dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category}
                  </option>
                ))}
              </select>

              {/* Stock status filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
              >
                <option value="all">All Stock Levels</option>
                <option value="low">Low Stock Alert (&lt; 5)</option>
                <option value="in_stock">In Stock (&ge; 1)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
            </div>

              {/* Sorting controls */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
              <span className="text-xs text-stone-400">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700"
              >
                <option value="title">Item Name (A-Z)</option>
                <option value="price">Price</option>
                <option value="quantity">Quantity in Stock</option>
                <option value="weight">Weight / Unit (kg)</option>
                <option value="totalWeight">Total Weight (kg)</option>
                <option value="subtotal">Calculated Subtotal</option>
                <option value="category">Category</option>
              </select>

              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title="Toggle sort order"
                className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-100 transition"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Inventory Table with requirement checks:
              - compact table view
              - small constrained image thumbnails (neat & readable)
              - weight column (weight per unit in kg)
              - total weight column (weight per unit * total units in stock)
              - calculated "Subtotal" column (Price per Unit * Quantity in Stock)
              - Low Stock Indicator (soft red highlight when stock < 5)
              - Table Footer: "Final Grand Total" row summing all item subtotals, units, and total weight
              - Inline Editing for price, quantity, and weight per unit
          */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table id="inventory-management-table" className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100/80 text-stone-700 uppercase tracking-wider font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4 w-14">Image</th>
                    <th className="py-3 px-4">Code No.</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Price per Unit</th>
                    <th className="py-3 px-4 text-center">In Stock</th>
                    <th className="py-3 px-4 text-right">Weight / Unit</th>
                    <th className="py-3 px-4 text-right">Total Weight</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-center">Public Status</th>
                    <th className="py-3 px-4 text-center w-28">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-stone-500">
                        No inventory items found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isLowStock = product.quantityInStock > 0 && product.quantityInStock < 5;
                      const isOutOfStock = product.quantityInStock <= 0;
                      const subtotal = product.pricePerUnit * product.quantityInStock;
                      const rowTotalWeight = (product.weightPerUnit || 0) * product.quantityInStock;
                      const isEditing = editingId === product.id;
                      const thumbnail =
                        product.images.length > 0
                          ? product.images[0]
                          : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&auto=format&fit=crop&q=80';

                      return (
                        <tr
                          key={product.id}
                          id={`inventory-row-${product.id}`}
                          className={`transition-colors ${
                            isLowStock
                              ? 'bg-rose-50/70 hover:bg-rose-50 border-l-4 border-l-rose-500'
                              : isOutOfStock
                              ? 'bg-stone-50/80 text-stone-400'
                              : 'hover:bg-stone-50/80'
                          }`}
                        >
                          {/* Image Thumbnail: constrained size */}
                          <td className="py-2.5 px-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0 shadow-xs">
                              <img
                                src={thumbnail}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </td>

                          {/* Code No. */}
                          <td className="py-2.5 px-4 font-mono font-normal text-stone-600 whitespace-nowrap">
                            <span className="bg-stone-100 px-2 py-0.5 rounded text-[11px] border border-stone-200">
                              {product.codeNo}
                            </span>
                          </td>

                          {/* Item Name */}
                          <td className="py-2.5 px-4 font-medium text-stone-900 max-w-xs truncate">
                            <span title={product.title}>{product.title}</span>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-4 text-stone-600 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 border border-stone-200">
                              {product.category}
                            </span>
                          </td>

                          {/* Price Per Unit (supports inline edit) */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-stone-400">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-20 px-1.5 py-1 text-right bg-white border border-amber-400 rounded focus:outline-none text-xs font-mono"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => startInlineEdit(product)}
                                className="font-mono text-stone-900 hover:text-amber-700 hover:underline cursor-pointer"
                                title="Click to quick inline edit price"
                              >
                                {formatPrice(product.pricePerUnit)}
                              </button>
                            )}
                          </td>

                          {/* Quantity In Stock (supports inline edit + soft red low stock) */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                className="w-16 px-1.5 py-1 text-center bg-white border border-amber-400 rounded focus:outline-none text-xs font-mono"
                              />
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  onClick={() => startInlineEdit(product)}
                                  className={`font-mono px-2 py-0.5 rounded cursor-pointer ${
                                    isLowStock
                                      ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                                      : isOutOfStock
                                      ? 'bg-stone-200 text-stone-600'
                                      : 'bg-stone-100 text-stone-800'
                                  }`}
                                  title="Click to quick edit quantity"
                                >
                                  {product.quantityInStock}
                                </span>
                                {isLowStock && (
                                  <span className="text-[10px] text-rose-600 font-semibold tracking-tight">
                                    &lt; 5 Left
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Weight Per Unit (supports inline edit) */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editWeight}
                                  onChange={(e) => setEditWeight(e.target.value)}
                                  className="w-16 px-1.5 py-1 text-right bg-white border border-amber-400 rounded focus:outline-none text-xs font-mono"
                                />
                                <span className="text-stone-400 text-[10px]">kg</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => startInlineEdit(product)}
                                className="text-stone-700 hover:text-amber-700 hover:underline cursor-pointer"
                                title="Click to quick edit weight per unit"
                              >
                                {(product.weightPerUnit || 0).toFixed(2)} kg
                              </button>
                            )}
                          </td>

                          {/* Total Weight: weight per unit * total unit in the stock */}
                          <td className="py-2.5 px-4 text-right font-mono font-medium text-stone-800 whitespace-nowrap">
                            <span className="bg-amber-50/70 border border-amber-200/60 px-2 py-0.5 rounded text-[11px] text-stone-900">
                              {rowTotalWeight.toFixed(2)} kg
                            </span>
                          </td>

                          {/* Calculated Subtotal Column */}
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-stone-900 whitespace-nowrap">
                            {formatPrice(subtotal)}
                          </td>

                          {/* Public Visibility Toggle */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => toggleProductAvailability(product.id, product.isAvailable)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition ${
                                product.isAvailable
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                              }`}
                              title="Toggle public visibility"
                            >
                              {product.isAvailable ? (
                                <>
                                  <Eye className="w-3 h-3" /> Visible
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" /> Hidden
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions Column */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => saveInlineEdit(product.id)}
                                  disabled={isSavingInline}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Save inline changes"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-stone-400 hover:bg-stone-100 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded"
                                  title="Full Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id, product.title)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer: Requirement: Final Grand Total row summing all item subtotals, units, and total weight */}
                <tfoot className="bg-stone-900 text-stone-100 font-semibold border-t-2 border-stone-800">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 font-serif text-sm tracking-wide text-amber-300">
                      Final Grand Total Summary ({filteredProducts.length} Items Listed)
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-stone-300">
                      Totals:
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-mono text-amber-300 font-bold whitespace-nowrap">
                      {totalFilteredUnits} Units
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-stone-400">
                      -
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-amber-300 font-bold whitespace-nowrap">
                      {totalFilteredWeight.toFixed(2)} kg
                    </td>
                    <td className="py-3 px-4 text-right text-sm sm:text-base font-mono font-bold text-amber-300 whitespace-nowrap">
                      {formatPrice(finalGrandTotal)}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center text-xs text-stone-400 font-normal">
                      Inventory Valuation
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: GLOBAL SALES LOG TABLE ================= */}
      {activeTab === 'sales' && (
        <div id="sales-log-tab-content" className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Period Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
                {formatPrice(localSalesSummary.totalRevenue)}
              </div>
              <div className="text-[11px] text-stone-400 mt-1 capitalize">
                Window: {salesTimeframe} report
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Total Sold Units</span>
                <ShoppingBag className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
                {localSalesSummary.totalUnitsSold} Units
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                Deducted from stock
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Transactions Logged</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
                {localSalesSummary.transactionsCount}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                Recorded via POS terminal
              </div>
            </div>
          </div>

          {/* Time Range Filters & Sorting Controls */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Timeframe Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-400 mr-1">Time Range:</span>
              {(['daily', 'weekly', 'monthly', 'annually', 'custom'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setSalesTimeframe(tf);
                    fetchFilteredSales(tf);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                    salesTimeframe === tf
                      ? 'bg-stone-900 text-amber-300 shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {tf === 'daily' ? 'Daily (Today)' : tf}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs if custom is selected */}
            {salesTimeframe === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded px-2 py-1"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded px-2 py-1"
                />
                <button
                  onClick={() => fetchFilteredSales('custom')}
                  className="px-2.5 py-1 bg-amber-500 text-stone-900 font-medium rounded hover:bg-amber-400"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Sorting controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Sort By:</span>
              <select
                value={salesSortBy}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSalesSortBy(val);
                  fetchFilteredSales(salesTimeframe, val, salesSortOrder);
                }}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700"
              >
                <option value="timestamp">Date & Time</option>
                <option value="quantity">Quantity Sold</option>
                <option value="price">Total Amount</option>
              </select>

              <button
                onClick={() => {
                  const newDir = salesSortOrder === 'asc' ? 'desc' : 'asc';
                  setSalesSortOrder(newDir);
                  fetchFilteredSales(salesTimeframe, salesSortBy, newDir);
                }}
                className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sales Error Alert */}
          {salesErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{salesErrorMsg}</span>
              </div>
              <button
                onClick={() => fetchFilteredSales()}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded font-medium text-xs transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Sales Log Table */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table id="global-sales-log-table" className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Product Title</th>
                    <th className="py-3 px-4 text-center">Qty Sold</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Total Transacted</th>
                    <th className="py-3 px-4">Staff Associate</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {isLoadingSales ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        Loading sales transaction logs...
                      </td>
                    </tr>
                  ) : localSalesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        No sales transactions recorded for this timeframe.
                      </td>
                    </tr>
                  ) : (
                    localSalesList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-stone-400">
                          #{String(sale.id).padStart(5, '0')}
                        </td>
                        <td className="py-2.5 px-4 text-stone-600 whitespace-nowrap font-mono text-[11px]">
                          {formatDateTime(sale.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-normal text-stone-700 whitespace-nowrap">
                          <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            {sale.productCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-stone-900 max-w-xs truncate">
                          {sale.productTitle}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-stone-800">
                          {sale.quantitySold}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-stone-600">
                          {formatPrice(sale.unitPrice)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-800">
                          {formatPrice(sale.totalAmount)}
                        </td>
                        <td className="py-2.5 px-4 text-stone-500 text-[11px] truncate max-w-[150px]">
                          {sale.soldByEmail || `User #${sale.soldByUserId}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot className="bg-stone-900 text-stone-100 font-semibold border-t-2 border-stone-800">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 font-serif text-sm tracking-wide text-amber-300">
                      Period Total Summary
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-mono text-amber-300 font-bold">
                      {localSalesSummary.totalUnitsSold} Units
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-stone-400">
                      Revenue:
                    </td>
                    <td className="py-3 px-4 text-right text-sm sm:text-base font-mono font-bold text-amber-300">
                      {formatPrice(localSalesSummary.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-stone-400 text-xs">
                      {localSalesSummary.transactionsCount} Entries
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: STAFF MANAGEMENT ================= */}
      {activeTab === 'staff' && (
        <div id="staff-management-tab-content" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Staff Form */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h3 className="font-serif text-lg font-semibold text-stone-900 mb-2">
              Add Staff Associate
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              Create an administrative user or sales staff. Sales staff accounts are restricted to the POS register and
              limited sales logs.
            </p>

            {staffSuccessMsg && (
              <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{staffSuccessMsg}</span>
              </div>
            )}

            {staffErrorMsg && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{staffErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="associate@boutique.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Role Permission</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                >
                  <option value="ADMIN">Sales Staff (POS Register & Limited Logs)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full System Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreatingStaff}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-300 font-medium rounded-lg transition disabled:opacity-50 mt-2"
              >
                {isCreatingStaff ? 'Creating...' : 'Register Staff Account'}
              </button>
            </form>
          </div>

          {/* Active Staff List Table */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  Active Authorized Personnel
                </h3>
                <p className="text-xs text-stone-500">
                  Manage sales staff & administrators, reset credentials, reassign roles, or revoke access.
                </p>
              </div>
              <button
                onClick={fetchStaff}
                className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition text-xs flex items-center gap-1 border border-stone-200"
                title="Refresh staff list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {staffErrorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{staffErrorMsg}</span>
                </div>
                <button
                  onClick={fetchStaff}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded font-medium text-xs transition"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 text-stone-700 uppercase font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Staff Account</th>
                    <th className="py-2.5 px-3">Role & Access</th>
                    <th className="py-2.5 px-3 text-right">POS Sales Logged</th>
                    <th className="py-2.5 px-3">Registered</th>
                    <th className="py-2.5 px-3 text-center">Manage Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isLoadingStaff ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500">
                        Loading authorized personnel...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400">
                        No additional staff records found. Click Refresh to reload.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((user: any) => {
                      const isCurrentUser = user.id === currentUser.id;
                      const isRootAdmin = user.email.toLowerCase() === 'raph4sure007@gmail.com';
                      const isResetting = resettingUserId === user.id;

                      return (
                        <React.Fragment key={user.id}>
                          <tr className="hover:bg-stone-50/80 transition">
                            <td className="py-3 px-3 font-mono text-stone-400">#{user.id}</td>
                            <td className="py-3 px-3 font-medium text-stone-900">
                              <div className="flex items-center gap-1.5">
                                <span>{user.email}</span>
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-sans">
                                    You
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                    user.role === 'SUPER_ADMIN'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-stone-100 text-stone-700 border border-stone-200'
                                  }`}
                                >
                                  {user.role}
                                </span>
                                {!isRootAdmin && (
                                  <button
                                    onClick={() => handleToggleStaffRole(user.id, user.role)}
                                    title={`Switch role to ${user.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN'}`}
                                    className="text-[10px] text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                                  >
                                    Switch
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              <div className="text-stone-900 font-medium">
                                {formatPrice(user.salesVolume || 0)}
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {user.salesCount || 0} order{user.salesCount === 1 ? '' : 's'}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                              {formatDateTime(user.createdAt)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    if (isResetting) {
                                      setResettingUserId(null);
                                      setResetNewPassword('');
                                    } else {
                                      setResettingUserId(user.id);
                                      setResetNewPassword('');
                                    }
                                  }}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
                                  title="Reset password for this staff member"
                                >
                                  <KeyRound className="w-3 h-3 text-amber-600" />
                                  <span>{isResetting ? 'Close' : 'Reset Pass'}</span>
                                </button>

                                <button
                                  disabled={isRootAdmin || isCurrentUser}
                                  onClick={() => handleDeleteStaff(user.id, user.email)}
                                  className={`p-1 rounded-md transition ${
                                    isRootAdmin || isCurrentUser
                                      ? 'text-stone-300 cursor-not-allowed'
                                      : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title={
                                    isRootAdmin
                                      ? 'Primary root superAdmin cannot be deleted'
                                      : isCurrentUser
                                      ? 'Cannot delete your currently active account'
                                      : 'Delete and revoke staff account'
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline Password Reset Form Drawer */}
                          {isResetting && (
                            <tr className="bg-amber-50/50 border-y border-amber-200">
                              <td colSpan={6} className="py-3 px-4">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-xs font-medium text-stone-800 flex items-center gap-1">
                                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Set New Password for {user.email}:</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={resetNewPassword}
                                    onChange={(e) => setResetNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 chars)..."
                                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
                                  />
                                  <button
                                    onClick={() => handleResetPasswordSubmit(user.id)}
                                    disabled={isSubmittingPasswordReset || resetNewPassword.length < 6}
                                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-lg text-xs font-medium disabled:opacity-50 transition"
                                  >
                                    {isSubmittingPasswordReset ? 'Updating...' : 'Save New Password'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setResettingUserId(null);
                                      setResetNewPassword('');
                                    }}
                                    className="px-2.5 py-1.5 text-stone-500 hover:text-stone-800 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CATEGORY VISIBILITY ================= */}
      {activeTab === 'categories' && (
        <div id="category-visibility-tab-content" className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm max-w-2xl">
          <div className="mb-6">
            <h3 className="font-serif text-lg font-semibold text-stone-900 mb-1">
              Public Category Visibility Control
            </h3>
            <p className="text-xs text-stone-500">
              Requirement: Items and categories marked as &quot;Unavailable&quot; by the Super Admin must be hidden from the public view.
              Toggle visibility below to instantly publish or conceal full merchandise departments.
            </p>
          </div>

          <div className="divide-y divide-stone-100">
            {categories.map((cat) => (
              <div key={cat.category} className="py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-stone-900">{cat.category}</div>
                  <div className="text-xs text-stone-500">
                    {cat.isAvailable ? (
                      <span className="text-emerald-700 font-medium">Visible in public catalog</span>
                    ) : (
                      <span className="text-rose-600 font-medium">Hidden from public view (Unavailable)</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleCategoryAvailability(cat.category, cat.isAvailable)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    cat.isAvailable
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {cat.isAvailable ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Make Unavailable</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Make Available</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: UPLOAD / EDIT ITEM ================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">
              {modalMode === 'create' ? 'Upload New Item to Catalog' : 'Edit Product Details'}
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              Enter product specifications, unique identifier code, inventory volume, and images.
            </p>

            {formError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleProductFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Item Title / Description *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Royal Ankara Silk Kimono Robe"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Unique Code No. *</label>
                  <input
                    type="text"
                    required
                    value={formCodeNo}
                    onChange={(e) => setFormCodeNo(e.target.value.toUpperCase())}
                    placeholder="e.g. CLT-109"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase text-sm"
                  />
                  <span className="text-[10px] text-stone-400">Must be unique identifier</span>
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none text-sm"
                  >
                    <option value="Clothes">Clothes</option>
                    <option value="Bags">Bags</option>
                    <option value="Wrappers">Wrappers</option>
                    <option value="Fabrics">Fabrics</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Price / Unit ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPriceDollars}
                    onChange={(e) => setFormPriceDollars(e.target.value)}
                    placeholder="145.00"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Stock Units *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="15"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Weight / Unit (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    placeholder="0.75"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                </div>
              </div>

              {/* Image URLs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-700 font-medium">Image URLs</label>
                  <button
                    type="button"
                    onClick={() => setFormImageUrls([...formImageUrls, ''])}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Image URL
                  </button>
                </div>

                {formImageUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const copy = [...formImageUrls];
                        copy[idx] = e.target.value;
                        setFormImageUrls(copy);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                    />
                    {formImageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const copy = formImageUrls.filter((_, i) => i !== idx);
                          setFormImageUrls(copy);
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Public Visibility Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="form-is-available"
                  checked={formIsAvailable}
                  onChange={(e) => setFormIsAvailable(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="form-is-available" className="text-stone-700 font-medium">
                  Visible in public boutique catalog
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-xl font-medium shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingForm ? 'Saving...' : modalMode === 'create' ? 'Save & Publish' : 'Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
