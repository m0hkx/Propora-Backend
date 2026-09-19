import { MongoClient } from "mongodb"
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error("MONGODB_URI is not defined")
}

export const client = new MongoClient(uri)

export async function connectDatabase() {
  await client.connect()

  console.log("Connected to MongoDB")
}

export function getDatabase() {
  return client.db("property_management")
}

export async function closeDatabase() {
  await client.close()
}