'use strict';

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'designsup';

if (!uri) throw new Error('MONGODB_URI env is missing');

let client;
let connectPromise;

async function getClient() {
  if (client && client.topology && client.topology.isConnected && client.topology.isConnected()) {
    return client;
  }
  if (!connectPromise) {
    client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
      maxPoolSize: 5,
    });
    connectPromise = client.connect();
  }
  await connectPromise;
  return client;
}

async function getDb() {
  const c = await getClient();
  return c.db(dbName);
}

async function getCollection(name = 'installations') {
  const db = await getDb();
  return db.collection(name);
}

module.exports = { getDb, getCollection };
