require('dns').setServers(['8.8.8.8']);
require("dotenv").config();
const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "personal_expenses";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
let expenses;
let loans;
let applications;
let settings;
let users;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let inMemoryExpenses = [];
let inMemoryLoans = [];
let inMemoryApplications = [];
let inMemorySettings = { salary: 31000, cibil: 685 };
let useInMemory = false;

const authenticate = (req, res, next) => {
  req.userId = "default-user";
  next();
};

// Auth routes removed

app.get("/api/expenses", authenticate, async (req, res) => {
  try {
    if (useInMemory) {
      const entries = [...inMemoryExpenses].filter(e => e.userId === req.userId).sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.json({ entries: entries });
    }
    const entries = await expenses.find({ userId: req.userId }).sort({ date: -1, createdAt: -1 }).toArray();
    res.json({ entries: entries.map(e => ({ ...e, _id: e._id.toString() })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load expenses." });
  }
});

app.post("/api/expenses", authenticate, async (req, res) => {
  try {
    const { date, amount, category, shift = "", note = "" } = req.body;

    if (!date || !category || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Date, category and a positive amount are required." });
    }

    const doc = {
      userId: req.userId,
      date,
      amount: Number(amount),
      category,
      shift: category === "Travel" ? shift : "",
      note: String(note).slice(0, 200),
      createdAt: new Date()
    };

    if (useInMemory) {
      doc._id = Math.random().toString(36).substring(7);
      inMemoryExpenses.push(doc);
      return res.status(201).json({ entry: doc });
    }

    const result = await expenses.insertOne(doc);
    res.status(201).json({ entry: { ...doc, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save expense." });
  }
});

app.delete("/api/expenses/:id", authenticate, async (req, res) => {
  try {
    if (useInMemory) {
      inMemoryExpenses = inMemoryExpenses.filter(e => !(e._id === req.params.id && e.userId === req.userId));
      return res.json({ ok: true });
    }
    const result = await expenses.deleteOne({ _id: new ObjectId(req.params.id), userId: req.userId });
    if (!result.deletedCount) return res.status(404).json({ error: "Expense not found." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid expense ID." });
  }
});

app.get("/api/loans", authenticate, async (req, res) => {
  try {
    if (useInMemory) {
      const items = [...inMemoryLoans].filter(e => e.userId === req.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ entries: items });
    }
    const items = await loans.find({ userId: req.userId }).sort({ createdAt: -1 }).toArray();
    res.json({ entries: items.map(e => ({ ...e, _id: e._id.toString() })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load loans." });
  }
});

app.post("/api/loans", authenticate, async (req, res) => {
  try {
    const { lender, type, sanctioned, balance } = req.body;

    if (!lender || !type || !Number.isFinite(Number(sanctioned)) || !Number.isFinite(Number(balance))) {
      return res.status(400).json({ error: "Lender, type, sanctioned amount, and balance are required." });
    }

    const doc = {
      userId: req.userId,
      lender,
      type,
      sanctioned: Number(sanctioned),
      balance: Number(balance),
      createdAt: new Date()
    };

    if (useInMemory) {
      doc._id = Math.random().toString(36).substring(7);
      inMemoryLoans.push(doc);
      return res.status(201).json({ entry: doc });
    }

    const result = await loans.insertOne(doc);
    res.status(201).json({ entry: { ...doc, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save loan." });
  }
});

app.put("/api/loans/:id", authenticate, async (req, res) => {
  try {
    const { lender, type, sanctioned, balance } = req.body;
    if (!lender || !type || !Number.isFinite(Number(sanctioned)) || !Number.isFinite(Number(balance))) {
      return res.status(400).json({ error: "Lender, type, sanctioned amount, and balance are required." });
    }

    const updateDoc = {
      $set: {
        lender,
        type,
        sanctioned: Number(sanctioned),
        balance: Number(balance)
      }
    };

    if (useInMemory) {
      const idx = inMemoryLoans.findIndex(e => e._id === req.params.id && e.userId === req.userId);
      if (idx === -1) return res.status(404).json({ error: "Loan not found." });
      inMemoryLoans[idx] = { ...inMemoryLoans[idx], ...updateDoc.$set };
      return res.json({ ok: true, entry: inMemoryLoans[idx] });
    }

    const result = await loans.updateOne({ _id: new ObjectId(req.params.id), userId: req.userId }, updateDoc);
    if (!result.matchedCount) return res.status(404).json({ error: "Loan not found." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid loan ID or data." });
  }
});

app.delete("/api/loans/:id", authenticate, async (req, res) => {
  try {
    if (useInMemory) {
      inMemoryLoans = inMemoryLoans.filter(e => !(e._id === req.params.id && e.userId === req.userId));
      return res.json({ ok: true });
    }
    const result = await loans.deleteOne({ _id: new ObjectId(req.params.id), userId: req.userId });
    if (!result.deletedCount) return res.status(404).json({ error: "Loan not found." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid loan ID." });
  }
});

app.get("/api/applications", authenticate, async (req, res) => {
  try {
    if (useInMemory) {
      const items = [...inMemoryApplications].filter(e => e.userId === req.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ entries: items });
    }
    const items = await applications.find({ userId: req.userId }).sort({ createdAt: -1 }).toArray();
    res.json({ entries: items.map(e => ({ ...e, _id: e._id.toString() })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load applications." });
  }
});

app.post("/api/applications", authenticate, async (req, res) => {
  try {
    const { provider, type } = req.body;

    if (!provider || !type) {
      return res.status(400).json({ error: "Provider and type are required." });
    }

    const doc = {
      userId: req.userId,
      provider,
      type,
      status: "Pending",
      createdAt: new Date()
    };

    if (useInMemory) {
      doc._id = Math.random().toString(36).substring(7);
      inMemoryApplications.push(doc);
      return res.status(201).json({ entry: doc });
    }

    const result = await applications.insertOne(doc);
    res.status(201).json({ entry: { ...doc, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save application." });
  }
});

app.delete("/api/applications/:id", authenticate, async (req, res) => {
  try {
    if (useInMemory) {
      inMemoryApplications = inMemoryApplications.filter(e => !(e._id === req.params.id && e.userId === req.userId));
      return res.json({ ok: true });
    }
    const result = await applications.deleteOne({ _id: new ObjectId(req.params.id), userId: req.userId });
    if (!result.deletedCount) return res.status(404).json({ error: "Application not found." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid application ID." });
  }
});

app.get("/api/settings", authenticate, async (req, res) => {
  try {
    if (useInMemory) return res.json(inMemorySettings[req.userId] || { salary: 31000, cibil: 685 });
    const data = await settings.findOne({ userId: req.userId });
    res.json(data || { salary: 31000, cibil: 685 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load settings." });
  }
});

app.post("/api/settings", authenticate, async (req, res) => {
  try {
    const { salary, cibil } = req.body;
    if (useInMemory) {
      inMemorySettings[req.userId] = { salary: Number(salary), cibil: Number(cibil) };
      return res.json({ ok: true });
    }
    await settings.updateOne({ userId: req.userId }, { $set: { salary: Number(salary), cibil: Number(cibil) } }, { upsert: true });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save settings." });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    const db = client.db(DB_NAME);
    expenses = db.collection("expenses");
    loans = db.collection("loans");
    applications = db.collection("applications");
    settings = db.collection("settings");
    users = db.collection("users");
    
    await expenses.createIndex({ date: 1 });
    await expenses.createIndex({ category: 1 });
    await expenses.createIndex({ userId: 1 });
    await loans.createIndex({ userId: 1 });
    await applications.createIndex({ userId: 1 });
    await settings.createIndex({ userId: 1 }, { unique: true });
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.log("FALLING BACK TO IN-MEMORY STORAGE. Data will be lost on restart.");
    useInMemory = true;
    inMemorySettings = {};
  }
  
  app.listen(PORT, () => console.log(`Expense Tracker running on http://localhost:${PORT}`));
}

start();
