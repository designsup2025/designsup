const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI env is missing');

let client;
let clientPromise;

async function connect() {
  if (client && client.topology && client.topology.isConnected && client.topology.isConnected()) {
    return client;
  }
  if (!clientPromise) {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

async function getDb(dbName) {
  const c = await connect();
  return dbName ? c.db(dbName) : c.db();
}

async function getCollection(name, dbName) {
  const db = await getDb(dbName);
  return db.collection(name);
}

module.exports = { connect, getDb, getCollection };
