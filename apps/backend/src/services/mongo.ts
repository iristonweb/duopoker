import { MongoClient } from 'mongodb';
import { config } from '../config.js';

const client = new MongoClient(config.mongoUrl);
export const mongoClient = client;

let mongoReady = false;

/** True after a successful `connect`; false if Mongo is unavailable or not yet connected. */
export const isMongoReady = () => mongoReady;

export const getMongoDb = () => client.db(config.mongoDbName);

/** Connects to Mongo for replays and analytics. Safe to call once at startup; failures are non-fatal. */
export const tryConnectMongo = async (): Promise<void> => {
  try {
    await client.connect();
    mongoReady = true;
  } catch (err) {
    mongoReady = false;
    console.warn('[mongo] connection failed — HTTP/Socket will start; replays and Mongo-side logs disabled.', err);
  }
};
