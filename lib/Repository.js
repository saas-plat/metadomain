const mongo = require('sourced-repo-mongo/mongo');
const Repository = require('sourced-repo-mongo').Repository;
const debug = require('debug')('saas-plat:repository');
//require('./fix');
const reps = {};
let mongodbConnected = false;
let connctdb;

const connect = () => {
  if (mongodbConnected) {
    return;
  }
  mongodbConnected = true;
  var url = 'mongodb://' + (process.env.MONGO_USER ? (encodeURIComponent(process.env.MONGO_USER) + ':' + encodeURIComponent(process.env.MONGO_PASSWORD) + '@') : '') +
    (process.env.MONGO_URL || (process.env.MONGO_PORT_27017_TCP_ADDR ? (process.env.MONGO_PORT_27017_TCP_ADDR + ':27017/sourced') : '') || "localhost/sourced");
  debug('connectting...', url);
  return new Promise((resolve, reject) => {
    mongo.once('connected', function (db) {
      connctdb = db;
      debug('mongodb connected.');
      resolve();
    });
    mongo.once('error', function (err) {
      mongodbConnected = false;
      debug('mongodb connect failed', err);
      reject(err);
    });
    mongo.connect(url);
  })
}

const close = () => {
  if (connctdb) {
    debug('mongodb close...');
    return connctdb.close();
  }
}

const findRep = (repository, id) => {
  if (typeof repository === 'string') {
    repository = getRep(repository);
  }
  return new Promise((resolve, reject) => {
    repository.get(id, (err, obj) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(obj);
    });
  });
}

const findAllRep = (repository, ids) => {
  if (typeof repository === 'string') {
    repository = getRep(repository);
  }
  return new Promise((resolve, reject) => {
    repository.getAll(ids, (err, obj) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(obj);
    });
  });
}

const commitAll = (repository, entities = []) => {
  return new Promise((resolve, reject) => {
    debug('commit entities',entities);
    repository.commitAll(entities, err => {
      debug('commit finished')
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

const commitRep = (repository, entities = []) => {
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].id === undefined || entities[i].id === null) {
      throw new BizError(i18n.t('单据ID不存在，无法提交'), 500);
    }
  }
  return commitAll(repository, entities);
}

const getRep = (entityName) => {
  return reps[entityName];
}

const repWapper = (repository) => {
  const commits = [];
  return {
    get: (id) => {
      return findRep(repository, id);
    },
    all: (...ids) => {
      return findAllRep(repository, ids);
    },
    create: () => {
      return repository.entityType.create();
    },
    commit: (...entities) => {
      commits.push(...entities);
    },
    commitAll: async (...entities) => {
      await commitRep(repository, commits.concat(entities));
    }
  };
}

exports.Repository = {
  close,
  connect,
  getRep,
  create: (EntityType) => {
    // 这里不能缓存，要不fields没有更新机制
    // if (reps[entityName]){
    //   return reps[entityName];
    // }
    reps[EntityType.name] = new Repository(EntityType);
    return repWapper(reps[EntityType.name]);
  }
}
