import { MongoClient } from 'mongodb';
import { config } from '../config.js';

const client = new MongoClient(config.mongoUrl);
export const mongoClient = client;
export const getMongoDb = () => client.db(config.mongoDbName);
