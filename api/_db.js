'use strict';

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;            // Atlas에서 받은 전체 연결 문자열
const dbName = process.env.MONGODB_DB || 'designsup'; // 원하면 Vercel에 MONGODB_DB도 설정

if (!uri) {
  throw new Error('MONGODB_URI env is missing');
}

let client;
let clientConn;

async function getClient() {
  if (client && client.topology && client.topology.isConnected && client.topology.isConnected()) {
    return client;
  }
  if (!clientConn) {
    client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
      maxPoolSize: 5,
    });
    clientConn = client.connect();
  }
  await clientConn;
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
