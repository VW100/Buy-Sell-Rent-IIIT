const User = require('../models/User');

module.exports = {
    async checkAuth(req, res) {
        try {
            const user = await User.findOne({ _id: req.session.userId });
            res.json({
                isAuthenticated: true,
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({ message: 'Error checking authentication status' });
        }
    },
    async getUserMe(req, res) {
        try {
            const userId = req.session.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User not logged in' });
            }
            const user = await User.findById(userId, 'firstName lastName');
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({ firstName: user.firstName, lastName: user.lastName });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    async getProfile(req, res) {
        try {
            const user = await User.findOne({ _id: req.session.userId });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                age: user.age,
                contactNumber: user.contactNumber,
                userId: String(user._id)
            });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching profile data' });
        }
    },
    async updateProfile(req, res) {
        try {
            const { firstName, lastName, email, age, contactNumber } = req.body;
            const user = await User.findOne({ _id: req.session.userId });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (email !== user.email) {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: 'Email is already in use' });
                }
            }
            user.firstName = firstName;
            user.lastName = lastName;
            user.email = email;
            user.age = age;
            user.contactNumber = contactNumber;
            await user.save();
            res.json({
                message: 'Profile updated successfully',
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    age: user.age,
                    contactNumber: user.contactNumber,
                    userId: String(user._id)
                }
            });
        } catch (error) {
            res.status(500).json({ message: 'Error updating profile' });
        }
    }
};

// random edit 780
