import session from "express-session";
import MongoStore from "connect-mongo";

/**
 * Production Session Configuration with MongoDB Store
 * - 24-Hour lifetime
 * - Rolling sessions (active users stay logged in)
 * - Persistent MongoDB session storage (survives server restarts)
 * - HttpOnly, Lax SameSite cookie security
 */
export const getSessionMiddleware = () => {
  const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUrl) {
    console.warn("⚠️ Warning: MONGO_URI / MONGODB_URI not found for MongoStore session backend. Falling back to default store.");
  }

  const storeOptions = mongoUrl
    ? {
      mongoUrl,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 24 hours in seconds
      autoRemove: "native",
      crypto: {
        secret: process.env.SESSION_SECRET || "mathsmanthra-session-crypto-key",
      },
    }
    : undefined;

  return session({
    secret: process.env.SESSION_SECRET || "mathsmanthra-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    store: storeOptions ? MongoStore.create(storeOptions) : undefined,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 Hours in milliseconds
      httpOnly: true, // Mitigate XSS cookie theft
      secure: process.env.NODE_ENV === "production", // Default HTTPS only in production, overridden dynamically on localhost
      sameSite: "lax", // CSRF defense with smooth navigation
    },
    rolling: true, // Reset maxAge on every active request to keep users logged in
  });
};

export default getSessionMiddleware;
