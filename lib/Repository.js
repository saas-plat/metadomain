const mongo = require('sourced-repo-mongo/mongo');
const Repository = require('sourced-repo-mongo').Repository;
const debug = require('debug')('saas-plat:repository');
const {
  BizError
} = require('./Error');
const i18n = require('./i18n');
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
    if (ids.length === 0) {
      // 取全部
      repository.getAll((err, obj) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(obj);
      });
    } else {
      repository.getAll(ids, (err, obj) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(obj);
      });
    }
  });
}

const commitAll = (repository, entities = []) => {
  return new Promise((resolve, reject) => {
    debug('commit entities', entities.length);
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
    get: (...ids) => {
      if (ids.length === 1) {
        return findRep(repository, ids[0]);
      }
      return findAllRep(repository, ids);
    },
    getAll: (...ids) => {
      return findAllRep(repository, ids);
    },
    create: () => {
      return repository.entityType.create();
    },
    commit: (...entities) => {
      commits.push(...entities);
    },
    entities: ()=>{
      return commits;
    },
    commitAll: async (...entities) => {
      commits.push(...entities);
      if (commits.length<=0){
        return;
      }
      await commitRep(repository, commits);
      commits.length = 0;
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
