const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Promotion = require('../models/Promotion');

const reportController = {
    // Sales Report
    getSalesReport: async (req, res) => {
        try {
            const { startDate, endDate, groupBy = 'day' } = req.query;
            const dateFilter = {};
            
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);

            const matchStage = {
                ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
                status: 'completed'
            };

            let groupStage = {
                _id: null,
                totalSales: { $sum: '$totalAmount' },
                orderCount: { $count: {} },
                averageOrderValue: { $avg: '$totalAmount' }
            };

            // Group by time period
            if (groupBy === 'day') {
                groupStage._id = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
            } else if (groupBy === 'month') {
                groupStage._id = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
            } else if (groupBy === 'year') {
                groupStage._id = { $dateToString: { format: '%Y', date: '$createdAt' } };
            }

            const salesData = await Order.aggregate([
                { $match: matchStage },
                { $group: groupStage },
                { $sort: { '_id': 1 } }
            ]);

            // Get top selling products
            const topProducts = await Order.aggregate([
                { $match: matchStage },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        totalQuantity: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                { $unwind: '$productDetails' }
            ]);

            res.json({
                salesData,
                topProducts,
                dateRange: { startDate, endDate },
                groupBy
            });
        } catch (error) {
            res.status(500).json({
                message: 'Error generating sales report',
                error: error.message
            });
        }
    },

    // Product Report
    getProductReport: async (req, res) => {
        try {
            const { category, sortBy = 'sales' } = req.query;
            
            const matchStage = {};
            if (category) matchStage.category = category;

            const products = await Product.aggregate([
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'orders',
                        localField: '_id',
                        foreignField: 'items.product',
                        as: 'orders'
                    }
                },
                {
                    $project: {
                        name: 1,
                        category: 1,
                        price: 1,
                        stock: 1,
                        totalSales: {
                            $reduce: {
                                input: '$orders',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.totalAmount'] }
                            }
                        },
                        totalOrders: { $size: '$orders' }
                    }
                },
                { $sort: sortBy === 'sales' ? { totalSales: -1 } : { totalOrders: -1 } }
            ]);

            res.json({
                products,
                totalProducts: products.length,
                filters: { category, sortBy }
            });
        } catch (error) {
            res.status(500).json({
                message: 'Error generating product report',
                error: error.message
            });
        }
    },

    // Inventory Report
    getInventoryReport: async (req, res) => {
        try {
            const products = await Product.aggregate([
                {
                    $group: {
                        _id: '$category',
                        totalProducts: { $sum: 1 },
                        totalStock: { $sum: '$stock' },
                        averagePrice: { $avg: '$price' },
                        lowStock: {
                            $sum: { $cond: [{ $lt: ['$stock', 10] }, 1, 0] }
                        }
                    }
                }
            ]);

            const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
                .select('name category stock price')
                .sort({ stock: 1 });

            res.json({
                categoryStats: products,
                lowStockProducts,
                totalCategories: products.length
            });
        } catch (error) {
            res.status(500).json({
                message: 'Error generating inventory report',
                error: error.message
            });
        }
    },

    // Customer Report
    getCustomerReport: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const dateFilter = {};
            
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);

            const customers = await User.aggregate([
                {
                    $lookup: {
                        from: 'orders',
                        localField: '_id',
                        foreignField: 'user',
                        as: 'orders'
                    }
                },
                {
                    $project: {
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        totalOrders: { $size: '$orders' },
                        totalSpent: {
                            $reduce: {
                                input: '$orders',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.totalAmount'] }
                            }
                        },
                        averageOrderValue: {
                            $cond: [
                                { $eq: [{ $size: '$orders' }, 0] },
                                0,
                                {
                                    $divide: [
                                        {
                                            $reduce: {
                                                input: '$orders',
                                                initialValue: 0,
                                                in: { $add: ['$$value', '$$this.totalAmount'] }
                                            }
                                        },
                                        { $size: '$orders' }
                                    ]
                                }
                            ]
                        }
                    }
                },
                { $sort: { totalSpent: -1 } }
            ]);

            res.json({
                customers,
                totalCustomers: customers.length,
                dateRange: { startDate, endDate }
            });
        } catch (error) {
            res.status(500).json({
                message: 'Error generating customer report',
                error: error.message
            });
        }
    },

    // Promotion Report
    getPromotionReport: async (req, res) => {
        try {
            const promotions = await Promotion.aggregate([
                {
                    $lookup: {
                        from: 'orders',
                        localField: 'code',
                        foreignField: 'promotionCode',
                        as: 'orders'
                    }
                },
                {
                    $project: {
                        name: 1,
                        code: 1,
                        type: 1,
                        value: 1,
                        startDate: 1,
                        endDate: 1,
                        isActive: 1,
                        usageCount: { $size: '$orders' },
                        totalDiscount: {
                            $reduce: {
                                input: '$orders',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.discountAmount'] }
                            }
                        }
                    }
                },
                { $sort: { usageCount: -1 } }
            ]);

            res.json({
                promotions,
                totalPromotions: promotions.length
            });
        } catch (error) {
            res.status(500).json({
                message: 'Error generating promotion report',
                error: error.message
            });
        }
    },

    // Revenue Report
    getRevenueReport: async (req, res) => {
        try {
            const { startDate, endDate, groupBy = 'day' } = req.query;
            const dateFilter = {};
            
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);

            let groupStage = {
                _id: null,
                totalRevenue: { $sum: '$totalAmount' },
                totalOrders: { $count: {} },
                averageRevenue: { $avg: '$totalAmount' },
                totalDiscount: { $sum: '$discountAmount' }
            };

            if (groupBy === 'day') {
                groupStage._id = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
            } else if (groupBy === 'month') {
                groupStage._id = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
            } else if (groupBy === 'year') {
                groupStage._id = { $dateToString: { format: '%Y', date: '$createdAt' } };
            }

            const revenueData = await Order.aggregate([
                {
                    $match: {
                        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
                        status: 'completed'
                    }
                },
                { $group: groupStage },
                { $sort: { '_id': 1 } }
            ]);

            res.json({
                revenueData,
                dateRange: { startDate, endDate },
                groupBy
            });
        } catch (error) {
            res.status(500).json({
                message: 'Error generating revenue report',
                error: error.message
            });
        }
    },

    // Export Report
    exportReport: async (req, res) => {
        try {
            const { reportType, format = 'json', ...filters } = req.body;
            
            // Get report data based on type
            let reportData;
            switch (reportType) {
                case 'sales':
                    reportData = await reportController.getSalesReport({ query: filters }, { json: (data) => data });
                    break;
                case 'products':
                    reportData = await reportController.getProductReport({ query: filters }, { json: (data) => data });
                    break;
                case 'inventory':
                    reportData = await reportController.getInventoryReport({ query: filters }, { json: (data) => data });
                    break;
                case 'customers':
                    reportData = await reportController.getCustomerReport({ query: filters }, { json: (data) => data });
                    break;
                case 'promotions':
                    reportData = await reportController.getPromotionReport({ query: filters }, { json: (data) => data });
                    break;
                case 'revenue':
                    reportData = await reportController.getRevenueReport({ query: filters }, { json: (data) => data });
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid report type' });
            }

            // Format can be extended to support CSV, PDF, etc.
            if (format === 'json') {
                res.json({
                    reportType,
                    filters,
                    data: reportData
                });
            } else {
                res.status(400).json({ message: 'Unsupported export format' });
            }
        } catch (error) {
            res.status(500).json({
                message: 'Error exporting report',
                error: error.message
            });
        }
    }
};

module.exports = reportController; 