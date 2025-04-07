const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use(
    session({
        secret: "hellosession",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60, // 1 hour
        },
    })
);

mongoose.connect("mongodb+srv://divyanshi1149be22:08022024@cluster0.gjrwp.mongodb.net/User?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => console.log("Connected to MongoDB"))
    .catch((error) => console.error("Error connecting to MongoDB:", error));

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});

const User = mongoose.model("users", userSchema);

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
};

// Serve signup.html on /signup route
app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Serve login.html on /login route
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Redirect to login if not authenticated
app.use((req, res, next) => {
    if (!req.session.user && req.path !== "/login" && req.path !== "/signup") {
        return res.redirect("/login");
    }
    next();
});

app.get("/", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

// Signup Route
app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error in signup route:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
        return res.status(400).json({ message: "Invalid credentials" });
    }
    req.session.user = user;
    res.status(200).json({ message: "Login successful", user });
});

// Logout Route
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});


//welcome page
app.get("/welcome", (req, res) => {
    console.log("Session user:", req.session.user);
    if (!req.session.user) {
        return res.redirect("/login"); // Redirect to login if not authenticated
    }
    res.render("welcome", { user: req.session.user });
});



// Product Schema and Routes
const productSchema = new mongoose.Schema({
    title: String,
    category: String,
    price: String,
    description: String,
    imageUrl: String,
});
const Product = mongoose.model("products", productSchema);

app.get("/products", requireAuth, async (req, res) => {
    try {
        const products = await Product.find();
        res.render("products", { products });
    } catch (error) {
        res.status(500).send("Error fetching products: " + error.message);
    }
});

// Cart Schema and Routes
const cartSchema = new mongoose.Schema({
    title: String,
    price: String,
    quantity: { type: Number, default: 1 },
    imageUrl: String,
    category: String,
});
const Cart = mongoose.model('carts', cartSchema);

app.post('/add-to-cart', requireAuth, async (req, res) => {
    try {
        const { title, price, quantity, image } = req.body;
        const numericPrice = parseFloat(String(price));
        let cartItem = await Cart.findOne({ title });

        if (cartItem) {
            cartItem.quantity += quantity ? parseInt(quantity) : 1; 
            cartItem.price = numericPrice * cartItem.quantity; 
            await cartItem.save();
        } else {
            const newItem = new Cart({
                title,
                price: numericPrice,
                quantity: quantity || 1,
                imageUrl: image,
            });
            await newItem.save();
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to add to cart.' });
    }
});

app.get('/cart', requireAuth, async (req, res) => {
    try {
        const cart = await Cart.find(); 
        res.render('cart', { cart }); 
    } catch (err) {
        res.status(500).json({ error: 'Failed to load cart.' });
    }
});



app.listen(5000, () => {
    console.log("Server is running on http://localhost:5000");
});
