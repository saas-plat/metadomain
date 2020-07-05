const mongo = require('sourced-repo-mongo-hotfix/mongo');
const debug = require('debug')('saas-plat:db');

let mongodbConnected = false;
let connctdb;
let locks;

const init = () => {
  locks = connctdb.collection('locks');
  connctdb.s.topology.on('reconnectFailed', function () {
    disconnectEntity();
  });
}

exports.collection = (name) => {
  return connctdb.collection(name);
}

exports.connect = async (  ) => {
    await connectEntity();

}

exports.disconnect = async ( ) => {
    await disconnectEntity();
}

exports.lock = async (scopeKey) => {
  if (!scopeKey) {
    return;
  }
  const lock = await locks.findOneAndUpdate({
    [scopeKey]: false
  }, {
    $set: {
      [scopeKey]: true
    }
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
    $set: {
      [scopeKey]: false
    }
  }, {
    upsert: true
  });
}

const connectEntity = async () => {
  if (mongodbConnected) {
    return connctdb;
  }
  mongodbConnected = true;
  var url = 'mongodb://' + (process.env.MONGO_USER ? (encodeURIComponent(process.env.MONGO_USER) + ':' + encodeURIComponent(process.env.MONGO_PASSWORD) + '@') : '') +
    (process.env.MONGO_URL || (process.env.MONGO_PORT_27017_TCP_ADDR ? (process.env.MONGO_PORT_27017_TCP_ADDR + ':27017/sourced') : '') || "localhost/sourced");
  debug('connectting...', url);
  exports.db = connctdb = await mongo.connect(url);;
  init();
  debug('mongodb connected.');
}

const disconnectEntity = async () => {
  if (connctdb) {
    debug('mongodb close...');
    const ret = await mongo.close(err=>{
      if (err){
        debug(err);
      }
    });
    exports.db = connctdb = null;
  }
}
