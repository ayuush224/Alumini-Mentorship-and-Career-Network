import mongoose from "mongoose";

/**
 * Shape of the global mongoose connection cache.
 * Prevents multiple connections during hot-reload in development.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Establishes (or reuses) a cached Mongoose connection to MongoDB.
 * Uses global caching to survive Next.js hot-module reloads without leaking connections.
 *
 * @returns The connected Mongoose instance.
 * @throws {Error} If MONGODB_URI is missing from environment variables.
 */
export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  // Return existing connection immediately if available
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB || "alumni_network",
    };

    cached.promise = mongoose.connect(uri, opts).then((instance) => {
      return instance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the cached promise so the next call retries the connection
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

let isReplSetCached: boolean | null = null;

/**
 * Checks if the connected MongoDB instance is a replica set or mongos capable of multi-document transactions.
 */
export async function isReplicaSet(): Promise<boolean> {
  if (isReplSetCached !== null) return isReplSetCached;
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    const hello = await admin.command({ hello: 1 });
    isReplSetCached = Boolean(hello.setName || hello.hosts);
    return isReplSetCached;
  } catch {
    return false;
  }
}

/**
 * Safely starts a Mongoose transaction if supported by the connected MongoDB cluster (Replica Set / mongos).
 * Returns null if running against a standalone MongoDB instance without replica set support.
 *
 * @returns A started ClientSession with an active transaction, or null for standalone instances.
 */
export async function startSafeTransaction(): Promise<mongoose.ClientSession | null> {
  await connectDB();
  const repl = await isReplicaSet();
  if (!repl) {
    return null;
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  return session;
}

export default connectDB;
