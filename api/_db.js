const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'designsup';

if (!uri) {
  console.warn('[DB] MONGODB_URI not set. DB calls will fail.');
}

let _client;
let _db;

async function getDb() {
  if (!_client) {
    _client = new MongoClient(uri, {
      tls: true,
      serverSelectionTimeoutMS: 8000,
    });
    await _client.connect();
    _db = _client.db(dbName);
    console.info('[DB] connected');
  }
  return _db;
}

async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

module.exports = { getDb, getCollection };
