import mongoose from "mongoose";

/**
 * Connect to MongoDB database using environment variables
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("❌ MongoDB Error: MONGO_URI is missing in environment variables.");
      process.exit(1);
    }

    console.log("⏳ Connecting to MongoDB database...");
    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Connected Successfully! Host: ${conn.connection.host} | DB Name: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;