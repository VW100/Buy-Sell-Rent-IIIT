const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    age: { type: Number, required: true },
    contactNumber: { type: String, required: true },
    password: { type: String, required: true },
    reviews: [{ type: String, required: true }],
});

module.exports = mongoose.model('User', userSchema);
