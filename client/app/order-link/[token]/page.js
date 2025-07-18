'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { use } from 'react';

export default function OrderLinkPage({ params }) {
  const { token } = use(params);
  const [orderLink, setOrderLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [materials, setMaterials] = useState([]);

  // Material Receipt Form State
  const [materialForm, setMaterialForm] = useState({
    confirmed: false,
    photoUrl: '',
    note: '',
    isSubmitting: false,
    error: null,
    success: null,
  });

  // Material Usage Form State
  const [materialUsageForm, setMaterialUsageForm] = useState({
    materialId: '',
    quantity: 0,
    notes: '',
    isSubmitting: false,
    error: null,
    success: null,
  });

  // Progress Report Form State
  const [progressForm, setProgressForm] = useState({
    pcsFinished: 0,
    photoUrl: '',
    resiPengiriman: '',
    note: '',
    isSubmitting: false,
    error: null,
    success: null,
  });

  // Fetch order link details
  useEffect(() => {
    const fetchOrderLink = async () => {
      try {
        setLoading(true);

        const response = await fetch(`http://localhost:8080/api/order-links/${token}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch order link');
        }

        const data = await response.json();
        console.log('Order link response:', data);

        if (!data.success) {
          throw new Error(data.message || 'Invalid or expired order link');
        }

        setOrderLink(data.orderLink);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching order link:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchMaterials = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/materials-management?limit=100');

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.materials) {
            setMaterials(data.data.materials);
          } else {
            setMaterials(data.materials || data || []);
          }
        }
      } catch (err) {
        console.error('Error fetching materials:', err);
      }
    };

    fetchOrderLink();
    fetchMaterials();
  }, [token]);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For simplicity, we'll just store the file name
      // In a real app, you would upload to a server or cloud storage
      setMaterialForm(prev => ({
        ...prev,
        photoUrl: file.name
      }));
    }
  };

  // Handle material receipt form change
  const handleMaterialFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setMaterialForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit material receipt
  const handleMaterialSubmit = async (e) => {
    e.preventDefault();

    try {
      setMaterialForm(prev => ({ ...prev, isSubmitting: true, error: null, success: null }));

      // Validation
      if (!materialForm.confirmed) {
        throw new Error('You must confirm that you have received the materials');
      }

      // In a real implementation, you would upload the photo and then submit the form
      // For now, we'll just simulate a successful submission

      // Simulated API call - replace with actual endpoint when available
      setTimeout(() => {
        setMaterialForm({
          confirmed: false,
          photoUrl: '',
          note: '',
          isSubmitting: false,
          error: null,
          success: 'Material receipt confirmed successfully'
        });
      }, 1000);

    } catch (err) {
      setMaterialForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message
      }));
      console.error('Error submitting material receipt:', err);
    }
  };

  // Handle progress form change
  const handleProgressFormChange = (e) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      // Ensure pcsFinished is not more than remaining
      const remaining = orderLink?.order ? orderLink.order.targetPcs - orderLink.order.completedPcs : 0;
      const newValue = Math.min(parseInt(value, 10) || 0, remaining);

      setProgressForm(prev => ({
        ...prev,
        [name]: newValue
      }));
    } else {
      setProgressForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle progress photo upload
  const handleProgressPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For simplicity, we'll just store the file name
      // In a real app, you would upload to a server or cloud storage
      setProgressForm(prev => ({
        ...prev,
        photoUrl: file.name
      }));
    }
  };

  // Submit progress report
  const handleProgressSubmit = async (e) => {
    e.preventDefault();

    try {
      setProgressForm(prev => ({ ...prev, isSubmitting: true, error: null, success: null }));

      // Validation
      if (!progressForm.pcsFinished || progressForm.pcsFinished <= 0) {
        throw new Error('Completed pieces must be greater than 0');
      }

      // Submit progress report via API
      const response = await fetch(`http://localhost:8080/api/order-links/${token}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pcsFinished: progressForm.pcsFinished,
          photoUrl: progressForm.photoUrl || null,
          resiPengiriman: progressForm.resiPengiriman || null,
          note: progressForm.note || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit progress report');
      }

      const data = await response.json();

      // Success - reset form and refresh order link data
      setProgressForm({
        pcsFinished: 0,
        photoUrl: '',
        resiPengiriman: '',
        note: '',
        isSubmitting: false,
        error: null,
        success: data.message || 'Progress report submitted successfully'
      });

      // Refresh order link data
      window.location.reload();

    } catch (err) {
      setProgressForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message
      }));
      console.error('Error submitting progress report:', err);
    }
  };

  // Handle material usage form changes
  const handleMaterialUsageChange = (e) => {
    const { name, value, type } = e.target;

    setMaterialUsageForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Submit material usage
  const handleMaterialUsageSubmit = async (e) => {
    e.preventDefault();

    try {
      setMaterialUsageForm(prev => ({ ...prev, isSubmitting: true, error: null, success: null }));

      // Validation
      if (!materialUsageForm.materialId) {
        throw new Error('Please select a material');
      }

      if (!materialUsageForm.quantity || materialUsageForm.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Submit material usage via API
      const response = await fetch(`http://localhost:8080/api/order-links/${token}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          materialId: parseInt(materialUsageForm.materialId),
          quantity: materialUsageForm.quantity,
          notes: materialUsageForm.notes || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record material usage');
      }

      const data = await response.json();

      // Success - reset form and refresh order link data
      setMaterialUsageForm({
        materialId: '',
        quantity: 0,
        notes: '',
        isSubmitting: false,
        error: null,
        success: data.message || 'Material usage recorded successfully'
      });

      // Refresh order link data
      window.location.reload();

    } catch (err) {
      setMaterialUsageForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message
      }));
      console.error('Error recording material usage:', err);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-500 text-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-center text-gray-800 mb-4">Error Loading Order</h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="text-center">
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!orderLink) {
    return null;
  }

  const { order: Order, user: User } = orderLink;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-white/80 to-secondary/5">
      {/* Header */}
      <header className="w-full bg-gradient-to-br from-primary/10 via-white/80 to-secondary/10 backdrop-blur-xl border-b border-gray-200 shadow-xl rounded-b-3xl px-0 py-8 mb-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 px-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold text-base-content bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight">
              Order: {orderLink?.order?.orderNumber || '...'}
            </h1>
            <span className="text-base-content/60 text-sm">Assigned to: {orderLink?.user?.name || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            {orderLink?.order?.status && (
              <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold">
                {orderLink.order.status}
              </span>
            )}
            {orderLink?.order?.dueDate && (
              <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                Due: {new Date(orderLink.order.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-12">
        <div className="bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl rounded-3xl border border-gray-200 shadow-xl p-8">
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Order Details
                </button>
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'materials'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Material Receipt
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'progress'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Progress Report
                </button>
                <button
                  onClick={() => setActiveTab('material-usage')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'material-usage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Material Usage
                </button>
                <Link
                  href={`/order-link/${token}/remaining-materials`}
                  className="py-4 px-6 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Remaining Materials
                </Link>
              </nav>
            </div>
          </div>

          {/* Content */}
          {/* Order Details Tab */}
          {activeTab === 'details' && (
            <div className="bg-gradient-to-br from-white/80 via-white/90 to-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg p-8 mb-6">
              <div className="mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-xl font-bold text-base-content mb-1">Order Details</h2>
                <p className="text-sm text-base-content/60">Details and specifications for this order.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Order Number</div>
                  <div className="text-base font-medium text-base-content">{Order.orderNumber}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold shadow-sm">
                    {Order.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Target Quantity</div>
                  <div className="text-base font-medium text-base-content">{Order.targetPcs} pcs</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Due Date</div>
                  <div className="text-base font-medium text-base-content">{formatDate(Order.dueDate)}</div>
                </div>
                <div className="md:col-span-2 mt-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</div>
                  <div className="text-base text-base-content">{Order.description || <span className='text-base-content/40 italic'>No description provided</span>}</div>
                </div>
                <div className="md:col-span-2 mt-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer Note</div>
                  <div className="text-base text-base-content">{Order.customerNote || <span className='text-base-content/40 italic'>No customer notes</span>}</div>
                </div>
              </div>
            </div>
          )}

          {/* Material Receipt Tab */}
          {activeTab === 'materials' && (
            <div className="bg-gradient-to-br from-white/80 via-white/90 to-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg p-8 mb-6">
              <div className="mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-xl font-bold text-base-content mb-1">Material Receipt Confirmation</h2>
                <p className="text-sm text-base-content/60">Please confirm when you receive the materials for this order.</p>
              </div>
              <form onSubmit={handleMaterialSubmit} className="space-y-6">
                <div>
                  <label htmlFor="photoUrl" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Receipt Photo</label>
                  <div className="flex items-center gap-3">
                    <input type="file" id="photoUrl" name="photoUrl" accept="image/*" onChange={handleFileChange} className="sr-only" />
                    <label htmlFor="photoUrl" className="relative cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 transition-all">
                      <span>Upload a photo</span>
                    </label>
                    <span className="text-sm text-gray-500">{materialForm.photoUrl ? materialForm.photoUrl : 'No file selected'}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Take a photo of the received materials to confirm receipt.</p>
                </div>
                <div>
                  <label htmlFor="note" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
                  <textarea id="note" name="note" rows={3} value={materialForm.note} onChange={handleMaterialFormChange} placeholder="Any notes about the received materials..." className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 text-gray-900 transition-all" />
                </div>
                <div className="flex items-start gap-3">
                  <input id="confirmed" name="confirmed" type="checkbox" checked={materialForm.confirmed} onChange={handleMaterialFormChange} className="focus:ring-blue-500 h-5 w-5 text-blue-600 border border-gray-300 rounded-lg transition-all" />
                  <div className="text-sm">
                    <label htmlFor="confirmed" className="font-medium text-base-content">I confirm that I have received all materials for this order</label>
                    <p className="text-gray-400 text-xs">By checking this box, you confirm that all required materials for this order have been received.</p>
                  </div>
                </div>
                <button type="submit" disabled={materialForm.isSubmitting || !materialForm.confirmed} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow font-semibold text-base text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {materialForm.isSubmitting ? 'Submitting...' : 'Confirm Material Receipt'}
                </button>
                {materialForm.success && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-2">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      <span className="text-sm font-medium text-green-800">{materialForm.success}</span>
                    </div>
                  </div>
                )}
                {materialForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-2">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                      <span className="text-sm font-medium text-red-800">{materialForm.error}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Material Usage Tab */}
          {activeTab === 'material-usage' && (
            <div className="bg-gradient-to-br from-white/80 via-white/90 to-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg p-8 mb-6">
              <div className="mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-xl font-bold text-base-content mb-1">Material Usage</h2>
                <p className="text-sm text-base-content/60">Record materials used for this order.</p>
              </div>
              <form onSubmit={handleMaterialUsageSubmit} className="space-y-6">
                {/* Form success/error messages */}
                {materialUsageForm.success && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      <span className="text-sm font-medium text-green-800">{materialUsageForm.success}</span>
                    </div>
                  </div>
                )}
                {materialUsageForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                      <span className="text-sm font-medium text-red-800">{materialUsageForm.error}</span>
                    </div>
                  </div>
                )}
                {/* Material Selection */}
                <div>
                  <label htmlFor="materialId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Material <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="materialId"
                    name="materialId"
                    value={materialUsageForm.materialId}
                    onChange={handleMaterialUsageChange}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 text-gray-900 transition-all"
                    required
                  >
                    <option value="">Select a material</option>
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.code}) - {material.qtyOnHand} {material.unit} available
                      </option>
                    ))}
                  </select>
                </div>
                {/* Quantity */}
                <div>
                  <label htmlFor="quantity" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Quantity Used <span className="text-red-600">*</span>
                  </label>
                  <div className="mt-1 flex rounded-lg shadow-sm">
                    <input
                      type="number"
                      name="quantity"
                      id="quantity"
                      min="0.001"
                      step="0.001"
                      value={materialUsageForm.quantity}
                      onChange={handleMaterialUsageChange}
                      className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-lg sm:text-sm border border-gray-300 bg-gray-50 text-gray-900 py-3 px-4 transition-all"
                      required
                    />
                    <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm">
                      {materials.find(m => m.id === parseInt(materialUsageForm.materialId))?.unit || 'units'}
                    </span>
                  </div>
                </div>
                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={materialUsageForm.notes}
                    onChange={handleMaterialUsageChange}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 text-gray-900 transition-all"
                    placeholder="Add any notes about this material usage..."
                  ></textarea>
                </div>
                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={materialUsageForm.isSubmitting || !materialUsageForm.materialId || materialUsageForm.quantity <= 0}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow font-semibold text-base text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {materialUsageForm.isSubmitting ? 'Recording...' : 'Record Material Usage'}
                  </button>
                </div>
              </form>
              {/* Material Usage History */}
              <div className="mt-10 bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl rounded-2xl border border-gray-100 shadow p-6 mb-6">
                <h3 className="text-lg font-bold text-base-content mb-4">Material Usage History</h3>
                {orderLink?.order?.materialMovements && orderLink.order.materialMovements.length > 0 ? (
                  <ul>
                    {orderLink.order.materialMovements.map((movement, movementIdx) => (
                      <li key={movement.id} className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-b-0">
                        <span className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-base-content">Used {movement.quantity} {movement.unit} of {movement.material.name}</div>
                          {movement.notes && <div className="text-sm text-base-content/70">{movement.notes}</div>}
                        </div>
                        <div className="text-xs text-gray-400 italic whitespace-nowrap mt-1">{formatDate(movement.movementDate)}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <svg className="h-8 w-8 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                    <div className="text-sm text-gray-400 text-center">No material usage recorded yet.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Report Tab */}
          {activeTab === 'progress' && (
            <div className="bg-gradient-to-br from-white/80 via-white/90 to-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg p-8 mb-6">
              <div className="mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-xl font-bold text-base-content mb-1">Progress Report</h2>
                <p className="text-sm text-base-content/60">Report your production progress on this order.</p>
              </div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-base-content mb-2">Current Progress</h3>
                <div className="flex items-center mb-2 gap-3">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className={`h-4 rounded-full transition-all duration-300 ${Order.completedPcs / Order.targetPcs < 0.3 ? 'bg-red-400' : Order.completedPcs / Order.targetPcs < 0.7 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${Math.round((Order.completedPcs / Order.targetPcs) * 100)}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-base-content whitespace-nowrap">{Math.round((Order.completedPcs / Order.targetPcs) * 100)}% <span className="font-normal">({Order.completedPcs}/{Order.targetPcs} pcs)</span></span>
                </div>
              </div>
              <form onSubmit={handleProgressSubmit} className="space-y-6">
                <div>
                  <label htmlFor="pcsFinished" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Completed Pieces *</label>
                  <div className="flex items-center gap-2">
                    <input type="number" name="pcsFinished" id="pcsFinished" min="1" max={Order.targetPcs - Order.completedPcs} value={progressForm.pcsFinished} onChange={handleProgressFormChange} className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-lg sm:text-sm border-2 border-gray-300 bg-gray-50 text-gray-900 py-3 px-4 shadow-sm transition-all" required />
                    <span className="inline-flex items-center px-3 rounded-md border border-l-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm">pcs</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Maximum: {Order.targetPcs - Order.completedPcs} pcs remaining</p>
                </div>
                <div>
                  <label htmlFor="progressPhoto" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Progress Photo</label>
                  <div className="flex items-center gap-3">
                    <input type="file" id="progressPhoto" name="progressPhoto" accept="image/*" onChange={handleProgressPhotoChange} className="sr-only" />
                    <label htmlFor="progressPhoto" className="relative cursor-pointer bg-gray-50 py-2 px-4 border-2 border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-900 hover:bg-gray-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 transition-all">
                      <span>Upload a photo</span>
                    </label>
                    <span className="text-sm text-gray-500">{progressForm.photoUrl ? progressForm.photoUrl : 'No file selected'}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Take a photo of the completed pieces to verify progress.</p>
                </div>
                <div>
                  <label htmlFor="resiPengiriman" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shipping Receipt Number (Optional)</label>
                  <input type="text" name="resiPengiriman" id="resiPengiriman" value={progressForm.resiPengiriman} onChange={handleProgressFormChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 py-3 px-4 transition-all" placeholder="Enter shipping receipt/tracking number" />
                  <p className="mt-1 text-xs text-gray-400">If you&apos;ve shipped the completed pieces, enter the tracking number.</p>
                </div>
                <div>
                  <label htmlFor="note" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
                  <textarea id="note" name="note" rows={3} value={progressForm.note} onChange={handleProgressFormChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 py-3 px-4 transition-all" placeholder="Add any notes about this progress update"></textarea>
                </div>
                <button type="submit" disabled={progressForm.isSubmitting || progressForm.pcsFinished <= 0} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow font-semibold text-base text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {progressForm.isSubmitting ? 'Submitting...' : 'Submit Progress Report'}
                </button>
                {progressForm.success && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-2">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      <span className="text-sm font-medium text-green-800">{progressForm.success}</span>
                    </div>
                  </div>
                )}
                {progressForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-2">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                      <span className="text-sm font-medium text-red-800">{progressForm.error}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Progress History */}
          {activeTab === 'progress' && (
            <div className="bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl rounded-2xl border border-gray-100 shadow p-6 mb-6">
              <div className="mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-lg font-bold text-base-content mb-1">Progress History</h2>
                <p className="text-sm text-base-content/60">View previous progress reports for this order.</p>
              </div>
              {Order.progressReports && Order.progressReports.length > 0 ? (
                <ul>
                  {Order.progressReports.map((report, reportIdx) => (
                    <li key={report.id} className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-b-0">
                      <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-base-content">Completed {report.pcsFinished} pcs</div>
                        {report.note && <div className="text-sm text-base-content/70">{report.note}</div>}
                        {report.resiPengiriman && (
                          <div className="text-xs text-gray-500 mt-1 italic">Shipping receipt: <span className="font-medium">{report.resiPengiriman}</span></div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 italic whitespace-nowrap mt-1">{formatDate(report.reportedAt || report.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="h-8 w-8 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  <div className="text-sm text-gray-400 text-center">No progress reports yet.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="bg-white/80 border-t border-gray-100 py-8 mt-8 rounded-t-3xl shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} WMS System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 