const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

module.exports = {
    async placeOrders(req, res) {
        const { cartItems } = req.body;
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const orders = await Promise.all(cartItems.map(async (item) => {
                const product = await Product.findById(item.productId);
                otp = Math.floor(100000 + Math.random() * 900000).toString();
                const hashedOtp = await bcrypt.hash(otp, 10);
                const order = new Order({
                    userId: req.session.userId,
                    productId: item.productId,
                    sellerId: product.sellerId,
                    quantity: item.quantity,
                    otp: hashedOtp
                });
                await order.save({ session });
                return order;
            }));
            await Cart.deleteMany({ userId: req.session.userId }).session(session);
            await session.commitTransaction();
            session.endSession();
            res.status(201).json({ message: 'Orders placed successfully', orders });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            res.status(500).json({ message: 'Error placing orders', error: error.message });
        }
    },
    async addReview(req, res) {
        try {
            const { orderId, review } = req.body;
            const order = await Order.findById(orderId).populate('sellerId').populate('productId');
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
            await User.findByIdAndUpdate(order.sellerId._id, { $push: { reviews: review } });
            res.status(200).json({ message: 'Review added successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error adding review' });
        }
    },
    async regenerateOtp(req, res) {
        try {
            const { orderId } = req.params;
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedOtp = await bcrypt.hash(newOtp, 10);
            const updatedOrder = await Order.findByIdAndUpdate(orderId, { otp: hashedOtp }, { new: true });
            if (!updatedOrder) {
                return res.status(404).json({ message: 'Order not found' });
            }
            res.status(200).json({ message: 'OTP regenerated successfully', otp: newOtp });
        } catch (error) {
            res.status(500).json({ message: 'Error regenerating OTP' });
        }
    },
    async getBoughtOrders(req, res) {
        try {
            const orders = await Order.find({ userId: req.session.userId })
                .populate('productId').populate('sellerId')
                .sort({ orderDate: -1 });
            res.json(orders);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching orders', error: error.message });
        }
    },
    async getSoldOrders(req, res) {
        try {
            const orders = await Order.find({ sellerId: req.session.userId, isDelivered: true })
                .populate('productId').populate('userId')
                .sort({ orderDate: -1 });
            res.json(orders);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching orders', error: error.message });
        }
    }
};
