const Repository = require('sourced-repo-mongo').Repository;
const debug = require('debug')('saas-plat:Repository');
const {
  BizError
} = require('./Error');
const {
  t
} = require('./i18n');
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

const getByIndex = (repository, index, value) => {
  return new Promise((resolve, reject) => {
    repository.repository._getByIndex(index, value, (err, entity) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(entity);
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
    //it['_type'] = it.constructor.name;
    return it;
  })
  return new Promise((resolve, reject) => {
    db.lock(scope).then(() => {
      debug('commit %s entities...', repository.entityType.name, entities.length);
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

const getRep = (entityName) => {
  return reps[entityName];
}

const repWapper = (repository, scope) => {
  const commits = [];
  const addCommints = (...entities) => {
    entities = entities.filter(it => it);
    for (const entity of entities) {
      if (!entity.id) {
        debug(1, entity)
        throw new BizError(t('实体id不存在，无法提交'), 500);
      }
    }
    const conflicts = entities.filter(it => commits.some(cit => cit.id === it.id && cit !== it));
    if (conflicts.length > 0) {
      throw new Error(t('实体{{entityTypes}}的id({{ids}})冲突', {
        entityTypes: conflicts.map(it => it.constructor.name).join(','),
        ids: conflicts.map(it => it.id).join(',')
      }))
    }
    entities = entities.filter(it => commits.every(cit => cit.id !== it.id));
    if (entities.length > 0) {
      debug('add commint...', entities.map(it => it.id));
      commits.push(...entities);
    }
  }
  return {
    get entityType() {
      return repository.entityType
    },
    get: async (...ids) => {
      debug('get %s...', repository.entityType.name, ...ids);
      if (ids.length == 0) {
        return null;
      }
      ids.forEach(id => {
        if (!id) throw new BizError(t('实体id无效，无法查找实体'));
      })
      // 要是有新增没有commit的从commits中查找
      const entities = (await Promise.all(ids.map(async id => commits.find(it => it.id === id) || await findRep(repository, id, scope)))).filter(it => it);
      addCommints(...entities);
      debug('get results:', entities.length)
      return ids.length === 1 ? entities[0] : entities;
    },
    getAll: async (...ids) => {
      const entities = (await findAllRep(repository, ids, scope)).filter(it => it);
      addCommints(...entities);
      return entities;
    },
    getByIndex: async (index, value) => {
      const entity = await getByIndex(repository, index, value);
      addCommints(entity);
      return entity;
    },
    create: async (...params) => {
      const entity = await repository.entityType.create(...params);
      addCommints(entity);
      return entity;
    },
    commit: (...entities) => {
      addCommints(...entities);
    },
    get entities() {
      return [...commits];
    },
    commitAll: async (...entities) => {
      addCommints(...entities);
      if (commits.length <= 0) {
        return;
      }
      await commitAll(repository, commits, scope);
      commits.length = 0;
    },
    rollback: (...entities) => {
      for (const it of entities) {
        const commitit = commits.find(cit => cit.id === it.id);
        if (commitit) {
          commits.splice(commits.indexOf(commitit), 1);
        }
      }
    },
    rollbackAll: () => {
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
      index,
      rules
    }) => index || (rules && rules.unique)).map(it => it.key);
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
