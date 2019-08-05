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

const findRep = (repository, id, scope) => {
  if (typeof repository === 'string') {
    repository = getRep(repository);
  }
  return new Promise((resolve, reject) => {
    repository.get(id, (err, obj) => {
      if (err) {
        reject(err);
        return;
      }
      if (scope.every(([k, v]) => obj[k] === v)) {
        resolve(obj);
      } else {
        resolve(null);
      }
    });
  });
}

const findAllRep = (repository, ids, scope) => {
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
        if (scope.every(([k, v]) => obj[k] === v)) {
          resolve(obj);
        } else {
          resolve(null);
        }
      });
    } else {
      repository.getAll(ids, (err, objs) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(objs.filter(obj => scope.every(([k, v]) => obj[k] === v)));
      });
    }
  });
}

const commitAll = (repository, entities = [], scope) => {
  entities = entities.map(it => {
    scope.forEach(([k, v]) => {
      it[k] = v;
    });
    return it;
  })
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

const commitRep = (repository, entities = [], scope) => {
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].id === undefined || entities[i].id === null) {
      throw new BizError(i18n.t('单据ID不存在，无法提交'), 500);
    }
  }
  return commitAll(repository, entities, scope);
}

const getRep = (entityName) => {
  return reps[entityName];
}

const repWapper = (repository, scope) => {
  const commits = [];
  return {
    get: (...ids) => {
      if (ids.length === 1) {
        return findRep(repository, ids[0], scope);
      }
      return findAllRep(repository, ids, scope);
    },
    getAll: (...ids) => {
      return findAllRep(repository, ids, scope);
    },
    create: () => {
      return repository.entityType.create();
    },
    commit: (...entities) => {
      commits.push(...entities);
    },
    entities: () => {
      return commits;
    },
    commitAll: async (...entities) => {
      commits.push(...entities);
      if (commits.length <= 0) {
        return;
      }
      await commitRep(repository, commits, scope);
      commits.length = 0;
    }
  };
}

exports.Repository = {
  close,
  connect,
  getRep,
  create: (EntityType, scope = {}) => {
    // 这里不能缓存，要不fields没有更新机制
    // if (reps[entityName]){
    //   return reps[entityName];
    // }
    const scopeFilter = Object.keys(scope).map(key => ([key, scope[key]]));
    reps[EntityType.name] = new Repository(EntityType, {
      indices: scopeFilter.map(([key]) => key)
    });
    return repWapper(reps[EntityType.name], scopeFilter);
  }
}
