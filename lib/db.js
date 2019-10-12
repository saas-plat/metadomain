const mongo = require('sourced-repo-mongo/mongo');
const debug = require('debug')('saas-plat:mongo');
const mongoose = require('mongoose');

let mongodbConnected = false;
let connctdb;
let locks;

const init = () => {
  locks = connctdb.collection('locks');
}

exports.collection = (name) => {
  return connctdb.collection(name);
}

exports.connect = async ({
  entity,
  data
} = {
  entity: true,
  data: false
}) => {
  if (entity) {
    await connectEntity();
  }
  if (data) {
    await connectData();
  }
}

exports.disconnect = async ({
  entity,
  data
} = {
  entity: true,
  data: false
}) => {
  if (data) {
    await disconnectData();
  }
  if (entity) {
    await disconnectEntity();
  }
}

exports.lock = async (scopeKey) => {
  if (!scopeKey) {
    return;
  }
  const lock = await locks.findOneAndUpdate({
    [scopeKey]: false
  }, {
    [scopeKey]: true
  }, {
    upsert: true,
    returnNewDocument: false
  });
  if (lock[scopeKey] === true) {
    throw Error(t('数据范围{{scopeKey}}已被锁定', {
      scopeKey
    }))
  }
}

exports.unlock = async (scopeKey) => {
  await locks.updateOne({
    [scopeKey]: true
  }, {
    [scopeKey]: false
  }, {
    upsert: true
  });
}

const connectEntity = async () => {
  return new Promise((resolve, reject) => {
    if (mongodbConnected) {
      return resolve(connctdb);
    }
    mongodbConnected = true;
    var url = 'mongodb://' + (process.env.MONGO_USER ? (encodeURIComponent(process.env.MONGO_USER) + ':' + encodeURIComponent(process.env.MONGO_PASSWORD) + '@') : '') +
      (process.env.MONGO_URL || (process.env.MONGO_PORT_27017_TCP_ADDR ? (process.env.MONGO_PORT_27017_TCP_ADDR + ':27017/sourced') : '') || "localhost/sourced");
    debug('connectting...', url);
    mongo.once('connected', function (db) {
      exports.db = connctdb = db;
      init();
      debug('mongodb connected.');
      resolve(connctdb);
    });
    mongo.once('error', function (err) {
      mongodbConnected = false;
      debug('mongodb connect failed', err);
      reject(err);
    });
    mongo.connect(url);
  })
}

const disconnectEntity = async () => {
  if (connctdb) {
    debug('mongodb close...');
    const ret = await connctdb.close();
    exports.db = connctdb = null;
  }
}

const db = mongoose.connection;
let connected = 'disconnected';

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  connected = 'connected';
  console.log('mongoose connected.');
});

const connectData = async () => {
  if (connected !== 'disconnected') {
    return connected;
  }
  connected = 'connecting';
  const url = 'mongodb://' + (process.env.MONGO_USER ? (encodeURIComponent(process.env.MONGO_USER) + ':' + encodeURIComponent(process.env.MONGO_PASSWORD) + '@') : '') +
    (process.env.MONGO_URL || (process.env.MONGO_PORT_27017_TCP_ADDR ? (process.env.MONGO_PORT_27017_TCP_ADDR + ':27017/query') : '') || "localhost/query");
  debug('connectting...', url);
  await mongoose.connect(url, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  });
  return connected;
}

const disconnectData = async () => {
  await mongoose.disconnect();
  connected = 'disconnected';
}
