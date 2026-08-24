import dotenv from "dotenv";
import mongoose from "mongoose";
import Announcement from "../models/Announcement.js";

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI environment variable is missing.");
  process.exit(1);
}

async function runMigration() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB successfully.");

    console.log("🔍 Inspecting and updating announcements collection...");
    const db = mongoose.connection.db;
    const collection = db.collection("announcements");

    const rawDocs = await collection.find({}).toArray();
    console.log(`Found ${rawDocs.length} total announcement(s).`);

    let updatedCount = 0;

    for (const doc of rawDocs) {
      const audience = doc.targetAudience || doc.targetType || "all";
      const status = doc.status || "draft";
      const title = doc.title || "Untitled Announcement";
      const content = doc.content || "";

      const updateFields = {};

      if (!doc.targetAudience || doc.targetAudience !== audience) {
        updateFields.targetAudience = audience;
      }
      if (!doc.targetType || doc.targetType !== audience) {
        updateFields.targetType = audience;
      }
      if (!doc.status || (doc.status !== "published" && doc.status !== "draft")) {
        updateFields.status = status;
      }
      if (!doc.title) {
        updateFields.title = title;
      }
      if (typeof doc.content !== "string") {
        updateFields.content = content;
      }

      if (Object.keys(updateFields).length > 0) {
        await collection.updateOne({ _id: doc._id }, { $set: updateFields });
        updatedCount++;
        console.log(`  ✓ Updated announcement "${title}" (ID: ${doc._id}) ->`, updateFields);
      }
    }

    console.log(`\n🎉 Migration completed! Fixed ${updatedCount} announcement(s).`);
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

runMigration();
