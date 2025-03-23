const Order = require('../models/Order');
const Product = require('../models/Product');

const orderController = {
    // Create new order
    async createOrder(req, res) {
        try {
            const { items, shippingAddress, paymentMethod, paymentDetails } = req.body;
            
            // Validate mobile payment details if required
            if (['bkash', 'nagad'].includes(paymentMethod)) {
                if (!paymentDetails || !paymentDetails.paymentNumber || !paymentDetails.transactionId) {
                    return res.status(400).json({ 
                        error: `For ${paymentMethod} payments, paymentNumber and transactionId are required` 
                    });
                }
                
                // Basic validation for payment number (should be a valid phone number)
                if (!/^\d{11}$/.test(paymentDetails.paymentNumber)) {
                    return res.status(400).json({ 
                        error: 'Payment number should be a valid 11-digit phone number' 
                    });
                }
                
                // Basic validation for transaction ID
                if (paymentDetails.transactionId.length < 6) {
                    return res.status(400).json({ 
                        error: 'Transaction ID is invalid' 
                    });
                }
            }
            
            // Calculate total amount
            let totalAmount = 0;
            for (const item of items) {
                const product = await Product.findById(item.product).lean();
                if (!product) {
                    return res.status(404).json({ error: `Product ${item.product} not found` });
                }
                
                // Verify product has required data (colorVariants)
                if (!product.colorVariants || product.colorVariants.length === 0) {
                    return res.status(400).json({ 
                        error: `Product ${product.name || product._id} has incomplete data (missing color variants)` 
                    });
                }

                // Determine product price based on availability
                const productPrice = product.salePrice || product.basePrice || product.price;
                if (isNaN(productPrice) || productPrice < 0) {
                    return res.status(400).json({ error: `Product ${product.name} has no valid price` });
                }
                
                // Check stock across all color variants
                let totalStock = 0;
                for (const variant of product.colorVariants) {
                    if (variant.sizes && Array.isArray(variant.sizes)) {
                        totalStock += variant.sizes.reduce((sum, size) => sum + (size.quantity || 0), 0);
                    }
                }
                
                if (totalStock < item.quantity) {
                    return res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
                }
                
                item.price = productPrice;
                totalAmount += productPrice * item.quantity;
            }

            // Create the order with the appropriate fields
            const orderData = {
                user: req.user._id,
                items,
                totalAmount,
                shippingAddress,
                paymentMethod,
                status: 'pending'
            };
            
            // Add payment details if they exist
            if (paymentDetails) {
                orderData.paymentDetails = paymentDetails;
                
                // For mobile payments, set payment status to 'paid' immediately
                // since they typically make payment before confirming order
                if (['bkash', 'nagad'].includes(paymentMethod)) {
                    orderData.paymentStatus = 'paid';
                }
            }

            const order = new Order(orderData);

            // Update product stock
            for (const item of items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: -item.quantity }
                });
            }

            await order.save();
            
            // Return the order with populated product info
            const populatedOrder = await Order.findById(order._id)
                .populate({
                    path: 'items.product',
                    select: 'name _id category'
                });
                
            res.status(201).json(populatedOrder);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get all orders for a user
    async getUserOrders(req, res) {
        try {
            const orders = await Order.find({ user: req.user._id })
                .populate('items.product')
                .sort({ createdAt: -1 });
            res.json(orders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get specific order by ID
    async getOrderById(req, res) {
        try {
            const order = await Order.findById(req.params.id)
                .populate('items.product')
                .populate('user', 'name email');

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Check if user is authorized to view this order
            if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized to view this order' });
            }

            res.json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Update order status (admin only)
    async updateOrderStatus(req, res) {
        try {
            const { status } = req.body;
            const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const order = await Order.findById(req.params.id);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            order.status = status;
            await order.save();

            res.json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Cancel order
    async cancelOrder(req, res) {
        try {
            const order = await Order.findById(req.params.id);
            
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Check if user is authorized to cancel this order
            if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized to cancel this order' });
            }

            // Only allow cancellation of pending or processing orders
            if (!['pending', 'processing'].includes(order.status)) {
                return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
            }

            // Restore product stock
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity }
                });
            }

            order.status = 'cancelled';
            await order.save();

            res.json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = orderController; 