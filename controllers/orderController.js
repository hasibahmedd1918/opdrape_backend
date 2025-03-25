const Order = require('../src/models/Order');

const orderController = {
  createOrder: async (req, res) => {
    try {
      const { products, shippingAddress, paymentMethod } = req.body;
      
      // Calculate total amount
      const totalAmount = products.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      const order = new Order({
        user: req.user.userId,
        products,
        shippingAddress,
        paymentMethod,
        totalAmount
      });
      
      await order.save();
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  getOrders: async (req, res) => {
    try {
      const orders = await Order.find({ user: req.user.userId })
        .populate('products.product');
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = orderController; 