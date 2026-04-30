import mongoose from "mongoose";

const MONGODB_URI: string =
  process.env.MONGODB_URI ||
  "mongodb+srv://nadhii:1234@cluster0.k0mhuox.mongodb.net/csrars?retryWrites=true&w=majority&appName=Cluster0";

interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };

    cached.promise = mongoose
      .connect(MONGODB_URI as string, opts)
      .then((mongoose) => {
        return mongoose.connection;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

