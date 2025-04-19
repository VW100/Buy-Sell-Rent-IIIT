const Product = require('../models/Product');
const User = require('../models/User');

module.exports = {
    async searchProducts(req, res) {
        const query = req.query.q.toLowerCase();
        const products = await Product.find({
            name: { $regex: query, $options: 'i' }
        }).limit(18);
        res.json(products);
    },
    async getInitialProducts(req, res) {
        try {
            const products = await Product.find()
                .limit(18)
                .sort({ createdAt: -1 });
            res.json(products);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch initial products' });
        }
    },
    async getCategories(req, res) {
        try {
            const categories = await Product.distinct('category');
            res.json({ categories });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching categories.' });
        }
    },
    async getProductById(req, res) {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const seller = await User.findOne({ _id: product.sellerId });
            if (!seller) {
                return res.status(404).json({ message: 'Seller not found' });
            }
            res.json({
                product,
                seller: {
                    firstName: seller.firstName,
                    lastName: seller.lastName,
                    email: seller.email,
                    reviews: seller.reviews
                }
            });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching product details' });
        }
    },
    async sellProduct(req, res) {
        try {
            const { name, price, description, category } = req.body;
            if (!req.session.userId) {
                return res.status(401).json({ message: 'Unauthorized. Please log in.' });
            }
            const newProduct = new Product({
                name,
                price,
                description,
                category,
                sellerId: req.session.userId
            });
            await newProduct.save();
            res.status(201).json({ message: 'Product added successfully!' });
        } catch (error) {
            res.status(500).json({ message: 'Error saving product.', details: error.message });
        }
    }
};
