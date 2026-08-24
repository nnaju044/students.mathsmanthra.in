import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    // Check sessions collection
    const sessionsCol = db.collection("sessions");
    const count = await sessionsCol.countDocuments();
    console.log("Session count:", count);
    const recent = await sessionsCol.find().limit(5).toArray();
    console.log("Recent sessions:", JSON.stringify(recent, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

run();
