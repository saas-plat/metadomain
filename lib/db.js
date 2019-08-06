const mongo = require('sourced-repo-mongo/mongo');
let mongodbConnected = false;
let connctdb;
let locks;

const init = () => {
  locks = connctdb.collection('locks');
}

exports.connect = () => {
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

exports.close = () => {
  if (connctdb) {
    debug('mongodb close...');
    const ret = connctdb.close();
    exports.db = connctdb = null;
    return ret;
  }
}

exports.lock = async (scope) => {
  const scopeKey = scope.reduce((arr, it) => arr.conccat(it[0]), []).join('_');
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

exports.unlock = async (scope) => {
  const scopeKey = scope.reduce((arr, it) => arr.conccat(it[0]), []).join('_');
  await locks.updateOne({
    [scopeKey]: true
  }, {
    [scopeKey]: false
  }, {
    upsert: true
  });
}
