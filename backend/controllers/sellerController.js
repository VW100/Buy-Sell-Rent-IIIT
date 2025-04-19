const Order = require('../models/Order');
const User = require('../models/User');

module.exports = {
    async getUndeliveredOrders(req, res) {
        try {
            const sellerId = req.session.userId;
            const undeliveredOrders = await Order.find({
                sellerId: sellerId,
                isDelivered: false
            }).populate('productId').populate('userId');
            res.status(200).json(undeliveredOrders);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },
    async confirmDelivery(req, res) {
        const { orderId, otp } = req.body;
        try {
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
            const isMatch = await require('bcryptjs').compare(otp, order.otp);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }
            order.isDelivered = true;
            await order.save();
            res.status(200).json({ message: 'Delivery confirmed successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
};
