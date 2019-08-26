const Repository = require('sourced-repo-mongo').Repository;
const debug = require('debug')('saas-plat:Repository');
const {
  BizError
} = require('./Error');
const i18n = require('./i18n');
const db = require('./db');
const reps = {};

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
    it['_type'] = it.constructor.name;
    return it;
  })
  return new Promise((resolve, reject) => {
    db.lock(scope).then(() => {
      debug('commit entities', entities.length);
      repository.commitAll(entities, err => {
        debug('commit finished')
        if (err) {
          reject(err);
          return;
        }
        db.unlock(scope).then(resolve).catch(reject);
      });
    }).catch(reject);
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
    get entityType() {
      return repository.entityType
    },
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
  getRep,
  create: async (EntityType, scope = {}) => {
    // 这里不能缓存，要不fields没有更新机制
    // if (reps[entityName]){
    //   return reps[entityName];
    // }
    //return new Promise((resolve, reject) => {
    const scopeFilter = Object.keys(scope).map(key => ([key.startsWith('_') ? key : '_' + key, scope[key]]));
    const indices = EntityType.fields.filter(({
      rules
    }) => rules && rules.unique).map(it => it.key);
    debug('indices', indices);
    const repository = new Repository(EntityType, {
      indices: [...indices, ...scopeFilter.map(([key]) => key), '_type']
    });
    //reps[EntityType.name] = repository;
    const ret = repWapper(repository, scopeFilter);
    repository.once('error', err => {
      throw err;
    });
    // 这个ready事件收不到同步执行啦
    // 导致同步db.close回报MongoError: topology was destroyed，可以忽略这个错误
    // repository.once('ready', () => {
    //   resolve(ret);
    // });
    return ret;
    //})
  }
}
