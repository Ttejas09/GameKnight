const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const User = require("./models/User");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

async function connectDB() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it in your .env file.");
  }

  // Beginner-friendly defaults: keep driver defaults for pool sizing.
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log("MongoDB connected");
}

app.get("/", function (req, res) {
  res.json({ message: "Auth server is running" });
});

app.post("/api/auth/register", async function (req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: newUser._id, email: newUser.email },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/api/auth/login", async function (req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/api/cart/:userId", async function (req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("cart email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Cart fetched successfully",
      cart: user.cart || [],
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/api/cart/add", async function (req, res) {
  try {
    const { userId, gameId, qty } = req.body;

    if (!userId || gameId == null) {
      return res.status(400).json({ message: "userId and gameId are required" });
    }

    const numericGameId = Number(gameId);
    const numericQty = Math.max(1, Number(qty) || 1);

    if (!Number.isFinite(numericGameId)) {
      return res.status(400).json({ message: "Invalid gameId" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingItem = user.cart.find(function (item) {
      return Number(item.gameId) === numericGameId;
    });

    if (existingItem) {
      existingItem.qty += numericQty;
    } else {
      user.cart.push({ gameId: numericGameId, qty: numericQty });
    }

    await user.save();

    return res.status(200).json({
      message: "Item added to cart",
      cart: user.cart,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/api/cart/remove", async function (req, res) {
  try {
    const { userId, gameId } = req.body;

    if (!userId || gameId == null) {
      return res.status(400).json({ message: "userId and gameId are required" });
    }

    const numericGameId = Number(gameId);
    if (!Number.isFinite(numericGameId)) {
      return res.status(400).json({ message: "Invalid gameId" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.cart = user.cart.filter(function (item) {
      return Number(item.gameId) !== numericGameId;
    });

    await user.save();

    return res.status(200).json({
      message: "Item removed from cart",
      cart: user.cart,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

connectDB()
  .then(function () {
    app.listen(PORT, function () {
      console.log("Server running on http://localhost:" + PORT);
    });
  })
  .catch(function (error) {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  });
