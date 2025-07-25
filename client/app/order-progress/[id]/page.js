'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ProductProgressCard from '@/app/components/ProductProgressCard';

export default function TailorProgressForm({ params }) {
  const router = useRouter();
  const resolvedParams = use(params); // Unwrap params Promise for Next.js 15+
  const { id } = resolvedParams; // This is the token
  const [orderLink, setOrderLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // NEW: Per-product progress state
  const [productProgressData, setProductProgressData] = useState({});
  const [overallNote, setOverallNote] = useState('');
  const [overallPhoto, setOverallPhoto] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [progressType, setProgressType] = useState('per-product'); // Changed from 'legacy'
  const [validationErrors, setValidationErrors] = useState({});

  // NEW: Per-product completion state
  const [completionSummary, setCompletionSummary] = useState(null);
  const [incompleteProducts, setIncompleteProducts] = useState([]);
  const [showCompletedProducts, setShowCompletedProducts] = useState(false);

  // Material tracking state (enhanced for per-product)
  const [productMaterials, setProductMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialMovementTickets, setMaterialMovementTickets] = useState([]);
  const [showMovementTickets, setShowMovementTickets] = useState(false);
  const [materialInventory, setMaterialInventory] = useState({});

  // Worker assignment state
  const [isWorkerFieldEditable, setIsWorkerFieldEditable] = useState(true);
  const [workerAssignmentSource, setWorkerAssignmentSource] = useState('manual');

  // Simple form reset function
  const resetFormCompletely = async () => {
    setError('');
    setSuccess('');
    setValidationErrors({});
    setSubmitting(false);
    await fetchOrderDetails();
  };

  // Fetch order details using token
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      const response = await fetch(`http://localhost:8080/api/order-links/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        // Enhanced error handling for non-JSON responses
        let errorMessage;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          errorMessage = data.message || 'Failed to fetch order details';
        } else {
          // Handle HTML error responses (like 500 Internal Server Error)
          const textResponse = await response.text();
          console.error('Non-JSON response received:', textResponse);
          errorMessage = `Server error (${response.status}): Please try again`;
        }

        if (response.status === 404) {
          throw new Error('Order link not found or inactive');
        }
        if (response.status === 400) {
          throw new Error('Order link has expired');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Order progress response:', data);
      setOrderLink(data.orderLink);

      // NEW: Set completion data from enhanced API response
      if (data.completionSummary) {
        setCompletionSummary(data.completionSummary);
      }

      if (data.incompleteProducts) {
        setIncompleteProducts(data.incompleteProducts);
      }

      // Initialize per-product progress data
      if (data.orderLink?.order?.orderProducts) {
        const initialProgressData = {};
        data.orderLink.order.orderProducts.forEach(orderProduct => {
          const product = orderProduct.product;
          if (product) {
            initialProgressData[product.id] = {
              productId: product.id,
              orderProductId: orderProduct.id, // Now we have the correct OrderProduct ID
              pcsFinished: 0,
              materialUsed: 0,
              workHours: 0,
              qualityScore: 100,
              qualityNotes: '',
              challenges: '',
              estimatedCompletion: '',
              photos: []
            };
          }
        });
        setProductProgressData(initialProgressData);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  // Fetch product materials when order is loaded
  useEffect(() => {
    if (orderLink?.order?.orderProducts) {
      fetchProductMaterials();
    }
  }, [orderLink]);

  // Enhanced tailor name synchronization with three-tier priority
  useEffect(() => {
    let tailorName = '';
    let isEditable = true;
    let source = 'manual';

    // Priority 1: Order assigned tailor contact (from orders-management with workerContactId)
    if (orderLink?.order?.workerContact?.name) {
      tailorName = orderLink.order.workerContact.name;
      isEditable = false;
      source = 'order';
    }
    // Priority 2: Order assigned worker (legacy User relationship)
    else if (orderLink?.order?.worker?.name) {
      tailorName = orderLink.order.worker.name;
      isEditable = false;
      source = 'order';
    }
    // Priority 3: OrderLink assigned user
    else if (orderLink?.user?.name) {
      tailorName = orderLink.user.name;
      isEditable = false;
      source = 'orderlink';
    }
    // Priority 4: No assignment - allow manual input
    else {
      tailorName = '';
      isEditable = true;
      source = 'manual';
    }

    setWorkerName(tailorName);
    setIsWorkerFieldEditable(isEditable);
    setWorkerAssignmentSource(source);
  }, [orderLink]);

  // Fetch product material relationships
  const fetchProductMaterials = async () => {
    if (!orderLink?.order?.orderProducts || orderLink.order.orderProducts.length === 0) {
      setProductMaterials([]);
      return;
    }

    try {
      setLoadingMaterials(true);
      const orderProducts = orderLink.order.orderProducts;

      // Use material data already included in orderLink response
      const materialData = orderProducts.map((orderProduct) => {
        const product = orderProduct.product;
        if (product?.baseMaterial) {
          const quantity = orderProduct.quantity || 1;

          return {
            productId: product.id,
            productName: product.name,
            materialId: product.materialId,
            materialName: product.baseMaterial.name,
            materialCode: product.baseMaterial.code,
            materialUnit: product.baseMaterial.unit,
            quantity: quantity
          };
        } else {
          console.log(`Product ${product?.name || 'Unknown'} has no material linked`);
          return null;
        }
      }).filter(Boolean);

      setProductMaterials(materialData);
      console.log('Product materials loaded from orderLink:', materialData);
    } catch (error) {
      console.error('Error loading product materials:', error);
      setProductMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Handle product progress changes from ProductProgressCard
  const handleProductProgressChange = (productId, orderProductId, progressData) => {
    setProductProgressData(prev => ({
      ...prev,
      [productId]: {
        ...progressData,
        productId,
        orderProductId
      }
    }));

    // Clear validation errors for this product
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`product_${productId}_`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  // Handle photo upload from ProductProgressCard
  const handleProductPhotoUpload = (productId, photos) => {
    console.log(`Photos uploaded for product ${productId}:`, photos);
    // Photos are already handled in the ProductProgressCard state
  };

  // Calculate total completed pieces from order data
  const getTotalCompleted = () => {
    if (!orderLink?.order?.completedPcs) return 0;
    return orderLink.order.completedPcs;
  };

  // Calculate total pieces from current per-product progress
  const getCurrentTotalPieces = () => {
    return Object.values(productProgressData).reduce((total, progress) => total + (progress.pcsFinished || 0), 0);
  };

  // Validate per-product progress data
  const validateProgressData = () => {
    const errors = {};
    let hasProgress = false;

    // Check if tailor name is provided
    if (!workerName || workerName.trim() === '') {
      errors.workerName = 'Please enter your name';
      return { isValid: false, errors };
    }

    // Validate each product's progress
    Object.values(productProgressData).forEach(progress => {
      if (progress.pcsFinished > 0) {
        hasProgress = true;

        // Validate pieces finished doesn't exceed target
        const orderProduct = orderLink.order.orderProducts.find(op => op.product.id === progress.productId);
        const targetQty = orderProduct?.quantity || 0;

        if (progress.pcsFinished > targetQty) {
          errors[`product_${progress.productId}_pcs`] = `Cannot exceed ${targetQty} pieces`;
        }
      }
    });

    if (!hasProgress) {
      errors.general = 'Please enter progress for at least one product';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Submit per-product progress report
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    setValidationErrors({});

    try {
      // Validate progress data
      const validation = validateProgressData();
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        throw new Error(validation.errors.general || 'Please fix the validation errors');
      }

      // 🔍 ENHANCED DEBUG: Multi-product submission analysis
      console.log('🔍 =============================================');
      console.log('🔍 FRONTEND MULTI-PRODUCT SUBMISSION DEBUG');
      console.log('🔍 =============================================');
      console.log('🔍 Total products in order:', Object.keys(productProgressData).length);
      console.log('🔍 Products with progress data:');

      let productsWithMaterial = 0;
      let totalMaterialPlanned = 0;

      Object.values(productProgressData).forEach((progress, index) => {
        const hasProgress = progress.pcsFinished > 0;
        const hasMaterial = progress.materialUsed > 0;

        if (hasMaterial) {
          productsWithMaterial++;
          totalMaterialPlanned += parseFloat(progress.materialUsed || 0);
        }

        console.log(`🔍   Product ${index + 1}:`, {
          productId: progress.productId,
          orderProductId: progress.orderProductId,
          pcsFinished: progress.pcsFinished,
          materialUsed: progress.materialUsed,
          hasProgress: hasProgress,
          hasMaterial: hasMaterial,
          willCreateMovement: hasProgress && hasMaterial
        });
      });

      console.log('🔍 Summary:');
      console.log(`🔍   Products with material usage: ${productsWithMaterial}`);
      console.log(`🔍   Total material planned: ${totalMaterialPlanned}`);
      console.log(`🔍   Expected MaterialMovement records: ${productsWithMaterial}`);

      // Prepare per-product progress data for API
      const apiProductProgressData = Object.values(productProgressData)
        .filter(progress => progress.pcsFinished > 0)
        .map(progress => {
          const mappedProgress = {
            productId: progress.productId,
            orderProductId: progress.orderProductId,
            pcsFinished: parseInt(progress.pcsFinished),
            pcsTargetForThisReport: parseInt(progress.pcsFinished),
            materialUsed: parseFloat(progress.materialUsed || 0),
            workHours: parseFloat(progress.workHours || 0),
            qualityScore: parseInt(progress.qualityScore || 100),
            qualityNotes: progress.qualityNotes || null,
            challenges: progress.challenges || null,
            estimatedCompletion: progress.estimatedCompletion ? new Date(progress.estimatedCompletion).toISOString() : null,
            photos: progress.photos.map(photo => ({
              url: photo.url,
              thumbnailUrl: photo.thumbnailUrl || null,
              caption: photo.caption || null,
              type: photo.type || 'progress',
              originalFileName: photo.file?.name || null,
              fileSize: photo.file?.size || null,
              mimeType: photo.file?.type || null
            }))
          };

          // Debug: Validate each product data
          console.log('🔍 Frontend mapping product:', progress.productId, {
            originalPcsFinished: progress.pcsFinished,
            parsedPcsFinished: parseInt(progress.pcsFinished),
            originalMaterialUsed: progress.materialUsed,
            parsedMaterialUsed: parseFloat(progress.materialUsed || 0),
            isValid: !isNaN(parseInt(progress.pcsFinished)) && parseInt(progress.pcsFinished) > 0,
            willCreateMovement: parseFloat(progress.materialUsed || 0) > 0,
            mappedProgress
          });

          return mappedProgress;
        });

      console.log('🔍 Frontend prepared API data:', {
        totalProducts: Object.keys(productProgressData).length,
        productsWithProgress: apiProductProgressData.length,
        productsWithMaterial: apiProductProgressData.filter(p => p.materialUsed > 0).length,
        apiProductProgressData
      });

      if (apiProductProgressData.length === 0) {
        throw new Error('Please enter progress for at least one product');
      }

      // Calculate if this will complete the order
      const currentProgress = getTotalCompleted();
      const newProgress = getCurrentTotalPieces();
      const totalProgress = currentProgress + newProgress;
      const isCompletingOrder = totalProgress >= orderLink.order.targetPcs;

      console.log('🔍 Submitting per-product progress:', {
        progressType: 'per-product',
        productCount: apiProductProgressData.length,
        materialUsageCount: apiProductProgressData.filter(p => p.materialUsed > 0).length,
        totalMaterialUsage: apiProductProgressData.reduce((sum, p) => sum + p.materialUsed, 0),
        overallNote,
        workerName,
        isCompletingOrder
      });

      const response = await fetch(`http://localhost:8080/api/order-links/${id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          progressType: 'per-product',
          productProgressData: apiProductProgressData,
          overallNote: overallNote || 'Per-product progress update',
          overallPhoto: overallPhoto || null,
          workerName: workerName,
          isCompletingOrder: isCompletingOrder
        })
      });

      // Enhanced error handling for non-JSON responses
      if (!response.ok) {
        let errorMessage;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || `Server error (${response.status})`;
          } catch (jsonError) {
            console.error('Failed to parse error response as JSON:', jsonError);
            errorMessage = `Server error (${response.status}): Unable to parse error response`;
          }
        } else {
          // Handle HTML error responses (like 500 Internal Server Error)
          const textResponse = await response.text();
          console.error('Non-JSON error response received:', textResponse);
          errorMessage = `Server error (${response.status}): Please refresh the page and try again`;
        }

        throw new Error(errorMessage);
      }

      // Parse JSON response with error handling
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse success response as JSON:', jsonError);
        throw new Error('Server returned invalid response format. Please try again.');
      }

      // 🔍 ENHANCED DEBUG: Backend response analysis
      console.log('🔍 =============================================');
      console.log('🔍 BACKEND RESPONSE ANALYSIS');
      console.log('🔍 =============================================');
      console.log('🔍 Success response received:', data);
      console.log('🔍 Material movements created:', data.materialMovements?.length || 0);
      console.log('🔍 Total material processed:', data.totalMaterialUsed || 0);

      if (data.materialMovements && data.materialMovements.length > 0) {
        console.log('🔍 MaterialMovement details:');
        data.materialMovements.forEach((movement, index) => {
          console.log(`🔍   Movement ${index + 1}:`, {
            id: movement.id,
            materialId: movement.materialId,
            materialName: movement.materialName,
            qty: movement.qty,
            description: movement.description,
            movementType: movement.movementType
          });
        });
      }

      setSuccess(data.message || 'Per-product progress report submitted successfully!');

      // Handle material movement tickets if created
      if (data.materialMovements && data.materialMovements.length > 0) {
        setMaterialMovementTickets(data.materialMovements);
        setShowMovementTickets(true);

        const totalMaterialUsed = data.totalMaterialUsed || 0;
        if (totalMaterialUsed > 0) {
          setSuccess(prev => `${prev}\n✅ Material usage recorded: ${totalMaterialUsed} total units`);
          setSuccess(prev => `${prev}\n✅ MaterialMovement records created: ${data.materialMovements.length}`);
        }
      }

      // Reset form but preserve assigned tailor name
      const resetProgressData = {};
      Object.keys(productProgressData).forEach(productId => {
        resetProgressData[productId] = {
          ...productProgressData[productId],
          pcsFinished: 0,
          materialUsed: 0,
          workHours: 0,
          qualityScore: 100,
          qualityNotes: '',
          challenges: '',
          estimatedCompletion: '',
          photos: []
        };
      });

      setProductProgressData(resetProgressData);
      setOverallNote('');
      setOverallPhoto('');

      // Refresh order details to show updated progress
      setTimeout(() => {
        fetchOrderDetails();
        setSuccess('');
        setShowMovementTickets(false);
        setMaterialMovementTickets([]);
      }, 5000);

    } catch (err) {
      console.error('🔍 FRONTEND ERROR:', err);
      setError(err.message);
      console.error('Error submitting per-product progress:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate progress percentage based on actual progress reports
  const calculateProgress = (order) => {
    if (!order || !order.targetPcs || order.targetPcs === 0) return 0;
    const totalCompleted = getTotalCompleted();
    return Math.round((totalCompleted / order.targetPcs) * 100);
  };

  // Get progress color
  const getProgressColor = (percentage) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // NEW: Per-product completion helper functions
  const getProductCompletion = (orderProduct) => {
    // Use the orderProduct data directly since API doesn't return per-product completion summary
    const completed = orderProduct.completedQty || 0;
    const target = orderProduct.quantity || 0;
    const percentage = target > 0 ? Math.round((completed / target) * 100) : 0;
    const isComplete = completed >= target;
    const remaining = Math.max(0, target - completed);

    return {
      completed,
      target,
      percentage,
      isComplete,
      completionDate: isComplete ? orderProduct.updatedAt : null,
      remaining
    };
  };

  const isProductComplete = (orderProduct) => {
    const completion = getProductCompletion(orderProduct);
    return completion?.isComplete || false;
  };

  const getCompletedProducts = () => {
    if (!orderLink?.order?.orderProducts) return [];
    return orderLink.order.orderProducts.filter(op => isProductComplete(op));
  };

  const getIncompleteProducts = () => {
    if (!orderLink?.order?.orderProducts) return [];
    return orderLink.order.orderProducts.filter(op => !isProductComplete(op));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error && !orderLink) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Order Link Invalid</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-400">Please check the link and try again</p>
        </div>
      </div>
    );
  }

  const order = orderLink?.order;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-white text-center">Per-Product Progress Update</h1>
          <p className="text-sm text-gray-300 text-center mt-2">
            Submit progress for each product in Order #{order?.orderNumber}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Order Summary Card */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Order Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex">
              <span className="text-sm text-gray-400 mr-2">Order Number:</span>
              <span className="text-sm font-medium text-white">{order?.orderNumber}</span>
            </div>

            <div className="flex">
              <span className="text-sm text-gray-400 mr-2">Status:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${order?.status === 'completed' ? 'bg-green-600 text-white' :
                order?.status === 'processing' ? 'bg-yellow-600 text-white' :
                  order?.status === 'confirmed' ? 'bg-blue-600 text-white' :
                    'bg-gray-600 text-white'
                }`}>
                {order?.status}
              </span>
            </div>

            <div className="flex">
              <span className="text-sm text-gray-400 mr-2">Due Date:</span>
              <span className="text-sm font-medium text-white">
                {order?.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>

          {order?.description && (
            <div className="mt-4">
              <span className="text-sm text-gray-400">Description:</span>
              <p className="text-sm text-white mt-1">{order.description}</p>
            </div>
          )}
        </div>

        {/* Overall Progress Overview */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Overall Progress</h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Completed:</span>
              <span className="text-lg font-bold text-white">{getTotalCompleted()} / {order?.targetPcs} pcs</span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(calculateProgress(order))}`}
                style={{ width: `${calculateProgress(order)}%` }}
              ></div>
            </div>

            <div className="text-center">
              <span className={`text-sm font-medium ${calculateProgress(order) === 100
                ? 'text-green-400 font-bold'
                : 'text-gray-300'
                }`}>
                {calculateProgress(order)}% Complete
                {calculateProgress(order) === 100 && (
                  <span className="ml-2">🎉</span>
                )}
              </span>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-400">
                Remaining: {Math.max(0, order?.targetPcs - getTotalCompleted())} pieces
              </span>
            </div>
          </div>
        </div>

        {/* Previous Progress Reports */}
        {orderLink?.order?.progressReports && orderLink.order.progressReports.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Previous Progress Reports</h3>

            <div className="space-y-3">
              {orderLink.order.progressReports.slice(-3).reverse().map((report, index) => {
                // Extract pieces completed from reportText (e.g., "Completed 40 pieces of jaket mantap")
                const pcsMatch = report.reportText?.match(/Completed (\d+) pieces/);
                const pcsCompleted = pcsMatch ? pcsMatch[1] : 'Unknown';

                return (
                  <div key={report.id} className="border border-gray-600 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-white">
                        {pcsCompleted} pieces completed
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {report.reportText && (
                      <p className="text-sm text-gray-300 mb-1">{report.reportText}</p>
                    )}
                    <p className="text-xs text-blue-400">
                      By: {report.order?.workerContact?.name || report.user?.name || 'Anonymous'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-Product Progress Forms */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            Per-Product Progress Update
            {order?.orderProducts && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({order.orderProducts.length} products)
              </span>
            )}
          </h3>

          {/* Global Error Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-md">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-red-300">{error}</p>
                  {error.includes('JSON') && (
                    <p className="text-xs text-red-400 mt-1">
                      💡 Tip: This might be a caching issue. Try the reset button.
                    </p>
                  )}
                </div>
                {error.includes('JSON') || error.includes('Server error') && (
                  <button
                    type="button"
                    onClick={resetFormCompletely}
                    disabled={loading}
                    className="ml-3 text-xs bg-red-800 hover:bg-red-700 text-red-200 px-2 py-1 rounded border border-red-600 disabled:opacity-50"
                  >
                    🔧 Reset Form
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-600 rounded-md">
              <p className="text-sm text-green-300 whitespace-pre-line">{success}</p>
            </div>
          )}

          {validationErrors.general && (
            <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-md">
              <p className="text-sm text-yellow-300">{validationErrors.general}</p>
            </div>
          )}

          {/* Material Movement Tickets Display */}
          {showMovementTickets && materialMovementTickets.length > 0 && (
            <div className="mb-6 p-4 bg-blue-900/50 border border-blue-600 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-blue-200">Material Movement Tickets Created</h4>
                <button
                  type="button"
                  onClick={() => setShowMovementTickets(false)}
                  className="text-xs text-blue-300 hover:text-blue-100"
                >
                  Hide
                </button>
              </div>

              <div className="space-y-2">
                {materialMovementTickets.map((movement, index) => (
                  <div key={movement.id || index} className="bg-gray-800 border border-blue-600 rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white">
                        {movement.materialName || 'Material'} - {movement.qty} units
                      </span>
                      <span className="text-xs text-blue-400">KELUAR</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{movement.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tailor Name Field */}
            <div>
              <label htmlFor="workerName" className="block text-sm font-medium text-gray-300 mb-1">
                Tailor Name <span className="text-red-600">*</span>
                {workerAssignmentSource === 'order' && (
                  <span className="ml-2 text-xs text-blue-400 font-normal">(Assigned to Order)</span>
                )}
                {workerAssignmentSource === 'orderlink' && (
                  <span className="ml-2 text-xs text-green-400 font-normal">(OrderLink Assigned)</span>
                )}
                {workerAssignmentSource === 'manual' && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">(Manual Entry)</span>
                )}
              </label>
              <input
                type="text"
                id="workerName"
                name="workerName"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                disabled={!isWorkerFieldEditable}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${isWorkerFieldEditable
                  ? 'border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white'
                  : 'border-gray-600 bg-gray-700 text-gray-400 cursor-not-allowed'
                  } ${validationErrors.workerName ? 'border-red-500' : ''}`}
                placeholder={isWorkerFieldEditable ? "Enter your name" : ""}
                required
              />
              {validationErrors.workerName && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.workerName}</p>
              )}
              {workerAssignmentSource === 'order' && (
                <p className="text-xs text-blue-400 mt-1">
                  ✓ This order is assigned to {orderLink?.order?.workerContact?.name || orderLink?.order?.worker?.name}. Name cannot be changed.
                </p>
              )}
            </div>

            {/* Per-Product Progress Cards */}
            <div className="space-y-6">
              <h4 className="text-md font-medium text-white">Product Progress</h4>

              {/* NEW: Completed Products Summary */}
              {getCompletedProducts().length > 0 && (
                <div className="bg-green-900/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-green-300 font-medium">
                      ✅ Completed Products ({getCompletedProducts().length})
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowCompletedProducts(!showCompletedProducts)}
                      className="text-sm text-green-400 hover:text-green-200"
                    >
                      {showCompletedProducts ? 'Hide' : 'Show'} Details
                    </button>
                  </div>

                  {showCompletedProducts && (
                    <div className="space-y-2">
                      {getCompletedProducts().map(orderProduct => {
                        const product = orderProduct.product;
                        const completion = getProductCompletion(orderProduct);
                        return (
                          <div key={orderProduct.id} className="bg-gray-800 border border-green-600 rounded p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-white">
                                {product.name}
                              </span>
                              <span className="text-xs text-green-400 font-medium">
                                {completion.completed}/{completion.target} pieces (100%)
                              </span>
                            </div>
                            {completion.completionDate && (
                              <p className="text-xs text-gray-400 mt-1">
                                Completed: {new Date(completion.completionDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* NEW: Completion Summary */}
              {completionSummary && (
                <div className="bg-blue-900/50 rounded-lg p-4 mb-6">
                  <h5 className="text-blue-300 font-medium mb-2">Order Progress Summary</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-400">Total Products:</span>
                      <div className="font-medium text-white">{completionSummary.totalProducts}</div>
                    </div>
                    <div>
                      <span className="text-blue-400">Completed:</span>
                      <div className="font-medium text-green-400">{completionSummary.completedProducts}</div>
                    </div>
                    <div>
                      <span className="text-blue-400">Total Pieces:</span>
                      <div className="font-medium text-white">{completionSummary.completedPieces}/{completionSummary.totalPieces}</div>
                    </div>
                    <div>
                      <span className="text-blue-400">Progress:</span>
                      <div className="font-medium text-white">{completionSummary.orderCompletionPercentage}%</div>
                    </div>
                  </div>
                </div>
              )}

              {order?.orderProducts && order.orderProducts.length > 0 ? (
                // NEW: Only show incomplete products by default
                getIncompleteProducts().length > 0 ? (
                  getIncompleteProducts().map((orderProduct, index) => {
                    const product = orderProduct.product;
                    if (!product) return null;

                    const completion = getProductCompletion(orderProduct);

                    return (
                      <div key={product.id} className="relative">
                        {/* NEW: Product completion indicator */}
                        {completion && completion.completed > 0 && (
                          <div className="mb-2 text-sm text-blue-400">
                            Progress: {completion.completed}/{completion.target} pieces ({completion.percentage}%)
                            {completion.remaining > 0 && (
                              <span className="text-gray-400"> - {completion.remaining} remaining</span>
                            )}
                          </div>
                        )}

                        <ProductProgressCard
                          key={product.id}
                          product={product}
                          orderProduct={orderProduct}
                          productProgress={productProgressData[product.id]}
                          onProgressChange={handleProductProgressChange}
                          onPhotoUpload={handleProductPhotoUpload}
                          isSubmitting={submitting}
                          errors={validationErrors}
                          completion={completion} // NEW: Pass completion data
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-green-400 bg-green-900/50 rounded-lg">
                    🎉 All products in this order have been completed!
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No products found in this order.
                </div>
              )}
            </div>

            {/* Overall Notes */}
            <div>
              <label htmlFor="overallNote" className="block text-sm font-medium text-gray-300 mb-1">
                Overall Notes (Optional)
              </label>
              <textarea
                id="overallNote"
                name="overallNote"
                rows="3"
                value={overallNote}
                onChange={(e) => setOverallNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                placeholder="Any overall notes about this progress update..."
                disabled={submitting}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || order?.status === 'completed' || getCurrentTotalPieces() === 0 || getIncompleteProducts().length === 0}
              className={`w-full py-3 px-4 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting || order?.status === 'completed' || getCurrentTotalPieces() === 0 || getIncompleteProducts().length === 0
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {submitting ? 'Submitting Per-Product Progress...' :
                order?.status === 'completed' ? 'Order Completed' :
                  getIncompleteProducts().length === 0 ? 'All Products Completed' :
                    getCurrentTotalPieces() === 0 ? 'Enter Progress for at Least One Product' :
                      `Submit Progress for ${getCurrentTotalPieces()} Total Pieces`}
            </button>

            {getCurrentTotalPieces() > 0 && getIncompleteProducts().length > 0 && (
              <p className="text-center text-sm text-gray-400">
                Submitting progress for {Object.values(productProgressData).filter(p => p.pcsFinished > 0).length} products,
                {getCurrentTotalPieces()} total pieces
              </p>
            )}

            {/* NEW: All products completed message */}
            {getIncompleteProducts().length === 0 && order?.orderProducts?.length > 0 && (
              <div className="text-center py-4">
                <div className="bg-green-900/50 border border-green-600 rounded-lg p-4">
                  <p className="text-green-300 font-medium">🎉 Congratulations!</p>
                  <p className="text-green-400 text-sm mt-1">
                    All products in this order have been completed. No further progress updates needed.
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Secure per-product progress update form for Order #{order?.orderNumber}
          </p>
        </div>
      </div>
    </div>
  );
} 