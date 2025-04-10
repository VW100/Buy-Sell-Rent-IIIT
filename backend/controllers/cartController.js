const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');

module.exports = {
    async getCart(req, res) {
        try {
            const cartItems = await Cart.find({ userId: req.session.userId });
            if (cartItems.length > 0) {
                const cartItemsWithProducts = await Cart.aggregate([
                    { $match: { userId: new mongoose.Types.ObjectId(req.session.userId) } },
                    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
                    { $unwind: '$product' },
                    { $lookup: { from: 'users', localField: 'product.sellerId', foreignField: '_id', as: 'seller' } },
                    { $unwind: '$seller' },
                    { $project: {
                        _id: 1, userId: 1, productId: 1, quantity: 1,
                        'product.name': 1, 'product.price': 1, 'product.description': 1, 'product.category': 1,
                        'seller.firstName': 1, 'seller.lastName': 1, 'seller.email': 1
                    }}
                ]);
                res.json(cartItemsWithProducts);
            } else {
                res.json([]);
            }
        } catch (error) {
            res.status(500).json({ message: 'Error fetching cart items', error: error.toString() });
        }
    },
    async addToCart(req, res) {
        try {
            const { productId, quantity } = req.body;
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const existingCartItem = await Cart.findOne({ userId: req.session.userId, productId });
            if (existingCartItem) {
                existingCartItem.quantity += quantity;
                await existingCartItem.save();
            } else {
                await Cart.create({ userId: req.session.userId, productId, quantity });
            }
            res.status(201).json({ message: 'Added to cart successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error adding to cart' });
        }
    },
    async checkCart(req, res) {
        try {
            const { productId } = req.query;
            const cartItem = await Cart.findOne({ userId: req.session.userId, productId });
            res.json({ inCart: !!cartItem });
        } catch (error) {
            res.status(500).json({ message: 'Error checking cart status' });
        }
    },
    async updateCart(req, res) {
        try {
            const { productId, quantity } = req.body;
            if (quantity < 1) {
                return res.status(400).json({ message: 'Quantity must be at least 1' });
            }
            const cartItem = await Cart.findOneAndUpdate(
                { userId: req.session.userId, productId: productId },
                { quantity },
                { new: true, runValidators: true }
            ).populate('productId');
            if (!cartItem) {
                return res.status(404).json({ message: 'Cart item not found', details: { userId: req.session.userId, productId } });
            }
            res.json(cartItem);
        } catch (error) {
            res.status(500).json({ message: 'Error updating cart item', error: error.message });
        }
    },
    async removeFromCart(req, res) {
        try {
            const result = await Cart.findOneAndDelete({ userId: req.session.userId, productId: new mongoose.Types.ObjectId(req.params.productId) });
            if (result) {
                res.json({ message: 'Removed from cart successfully', deletedItem: result });
            } else {
                res.status(404).json({ message: 'Item not found in cart', details: { userId: req.session.userId, productId: req.params.productId } });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error removing from cart', error: error.message });
        }
    }
};
