const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session'); 
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
dotenv.config();
const app = express();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const DB_URI = process.env.DB_URI;
const API_KEY = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL });
const xml2js = require('xml2js');
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: DB_URI,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.json());
app.use(cors({
    origin: [process.env.CORS_ORIGIN],
    credentials: true
}));
app.use(morgan('dev'));

// const RECAPTCHA_SECRET_KEY = '6LeL8boqAAAAADYNo6XHBvxhryPouo5HcPNMivab';

mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

const User = require('./models/User');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Please log in to continue' });
    }
};

/**
 * Generate a response from the AI model
 * @param {string} prompt - User query or message
 * @param {string[]} sessionHistory - Previous chat history of the session
 * @returns {Promise<string>} - AI's response text
 */
const getAIResponse = async (prompt, sessionHistory) => {
    try {
        const fullPrompt = sessionHistory.join("\n") + `\nUser: ${prompt}\nAI:`;
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
    } catch (error) {
        console.error("Error generating AI response:", error);
        return "I'm sorry, I couldn't process your request. Please try again later.";
    }
};

app.post("/api/chat", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
    }
    if (!req.session.chatHistory) {
        req.session.chatHistory = [];
    }
    try {
        const response = await getAIResponse(prompt, req.session.chatHistory);
        req.session.chatHistory.push(`User: ${prompt}`);
        req.session.chatHistory.push(`AI: ${response}`);
        res.json({ response });
    } catch (error) {
        console.error("Error handling chat request:", error);
        res.status(500).json({ error: "Failed to process chat request." });
    }
});

app.post("/api/chat/reset", (req, res) => {
    if (req.session) {
        req.session.chatHistory = [];
    }
    res.json({ message: "Chat history reset successfully." });
});


app.post('/signup',
    [
        body('firstName').isString().notEmpty(),
        body('lastName').isString().notEmpty(),
        body('email').isEmail(),
        body('age').isInt({ min: 0 }),
        body('contactNumber').isString().notEmpty(),
        body('password').isLength({ min: 8 }),
        body('recaptchaToken').isString().notEmpty()
    ],
    async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { firstName, lastName, email, age, contactNumber, password, recaptchaToken } = req.body;
    try {
        const recaptchaResponse = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
        );
        if (!recaptchaResponse.data.success) {
            return res.status(400).json({ message: 'Invalid reCAPTCHA' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered.' });
        }
        req.session.pendingEmail = email;
        req.session.pendingUser = { firstName, lastName, email, age, contactNumber, password };
        const serviceURL = encodeURIComponent('http://localhost:3000/api/Signup/cas/validate');
        return res.json({ redirectUrl: `https://login.iiit.ac.in/cas/login?service=${serviceURL}` });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({
            message: 'An error occurred during signup. Please try again.',
            details: error.message
        });
    }
});
app.get('/api/Signup/cas/validate', async (req, res) => {
    const ticket = req.query.ticket;
    const serviceURL = 'http://localhost:3000/api/Signup/cas/validate';
    if (!ticket) {
        return res.redirect('/');
    }
    try {
        const validateURL = `https://login.iiit.ac.in/cas/serviceValidate?ticket=${ticket}&service=${encodeURIComponent(serviceURL)}`;
        const response = await axios.get(validateURL);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        if (result['cas:serviceResponse']['cas:authenticationSuccess']) {
            const casUser = result['cas:serviceResponse']['cas:authenticationSuccess'][0]['cas:user'][0];
            const pendingEmail = req.session.pendingEmail;
            const pendingUser=req.session.pendingUser;
            req.session.pendingEmail = undefined;
            req.session.pendingUser = undefined;
            if (!pendingEmail) {
                return res.redirect('/');
            }
            // console.log(casUser);
            // console.log(pendingEmail);
            if (casUser === pendingEmail) {
                
                const hashedPassword = await bcrypt.hash(pendingUser.password, 10);
                const newUser = new User({
                    firstName: pendingUser.firstName,
                    lastName: pendingUser.lastName,
                    email: pendingUser.email,
                    age: pendingUser.age,
                    contactNumber: pendingUser.contactNumber,
                    password: hashedPassword
                });
                await newUser.save();
                req.session.userId = newUser._id;
                return res.redirect('/home');
            }
        }
        return res.redirect('/');
    } catch (error) {
        console.error('CAS validation error:', error);
        return res.redirect('/');
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password, recaptchaToken } = req.body;
    try {
        const recaptchaResponse = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
        );
        if (!recaptchaResponse.data.success) {
            return res.status(400).json({ message: 'Invalid reCAPTCHA' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        req.session.pendingEmail = email;
        const serviceURL = encodeURIComponent('http://localhost:3000/api/cas/validate');
        return res.json({ redirectUrl: `https://login.iiit.ac.in/cas/login?service=${serviceURL}` });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add this new endpoint to clear the session
app.post('/api/clear-session', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            res.status(500).json({ message: 'Failed to clear session' });
        } else {
            res.json({ message: 'Session cleared' });
        }
    });
});

app.get('/api/cas/validate', async (req, res) => {
    const ticket = req.query.ticket;
    const serviceURL = 'http://localhost:3000/api/cas/validate';
    if (!ticket) {
        return res.redirect('/login');
    }
    try {
        const validateURL = `https://login.iiit.ac.in/cas/serviceValidate?ticket=${ticket}&service=${encodeURIComponent(serviceURL)}`;
        const response = await axios.get(validateURL);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        if (result['cas:serviceResponse']['cas:authenticationSuccess']) {
            const casUser = result['cas:serviceResponse']['cas:authenticationSuccess'][0]['cas:user'][0];
            const pendingEmail = req.session.pendingEmail;
            req.session.pendingEmail = undefined;
            if (!pendingEmail ) {
                return res.redirect('/login');
            }
            // console.log(casUser);
            // console.log(pendingEmail);
            if (casUser === pendingEmail) {
                const user = await User.findOne({ email: pendingEmail });
                if (!user) {
                    return res.redirect('/login');
                }
                req.session.userId = user._id;
                return res.redirect('/home');
            }
        }
        return res.redirect('/login');
    } catch (error) {
        console.error('CAS validation error:', error);
        return res.redirect('/login');
    }
});

app.get('/check-auth', isAuthenticated, async (req, res) => {
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
});

app.get('/api/user/me', async (req, res) => {
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
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

app.use('/api', require('./routes/product'));
const cartRoutes = require('./routes/cart');
app.use('/api', cartRoutes);
const orderRoutes = require('./routes/order');
app.use('/api', orderRoutes);
const userRoutes = require('./routes/user');
const sellerRoutes = require('./routes/seller');
app.use('/api', userRoutes);
app.use('/api', sellerRoutes);

app.use(express.static(path.join(__dirname, '../frontend/my-app/build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/my-app/build', 'index.html'));
});

const PORT = 3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});