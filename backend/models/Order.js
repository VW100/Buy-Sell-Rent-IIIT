const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true },
    otp: { type: String, required: true },
    isDelivered: { type: Boolean, default: false },
    orderDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
