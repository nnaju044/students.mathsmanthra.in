import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const mongoUrl = process.env.MONGO_URI;
console.log("Using MONGO_URI:", mongoUrl ? "Found" : "Missing");

app.use(session({
  secret: process.env.SESSION_SECRET || "test-secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl,
    collectionName: "sessions",
    ttl: 24 * 60 * 60,
    crypto: {
      secret: process.env.SESSION_SECRET || "test-crypto-secret",
    }
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false, // Explicitly false for HTTP localhost test
    sameSite: "lax",
  }
}));

app.get("/set", (req, res) => {
  console.log("Inside /set handler, setting session value...");
  req.session.testVal = "hello";
  req.session.save((err) => {
    if (err) {
      console.error("Save error:", err);
      return res.status(500).send("Error");
    }
    console.log("Session saved successfully");
    res.send("Saved");
  });
});

const server = app.listen(8001, async () => {
  try {
    const response = await fetch("http://localhost:8001/set");
    console.log("Status:", response.status);
    console.log("Headers:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
