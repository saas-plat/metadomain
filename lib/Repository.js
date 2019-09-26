const Repository = require('sourced-repo-mongo').Repository;
const debug = require('debug')('saas-plat:Repository');
const {
  BizError
} = require('./Error');
const {
  t
} = require('./i18n');
const reps = {};

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

const getByIndex = (repository, index, value) => {
  return new Promise((resolve, reject) => {
    repository._getByIndex(index, value, (err, entity) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(entity);
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
      repository.getAll(ids, (err, objs) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(objs);
      });
    }
  });
}

const commitAll = (repository, entities = []) => {
  return new Promise((resolve, reject) => {
    // ** 这里的锁取消，改到调用服务里统一锁定 **
    // 命令是顺序执行，不需要锁
    // 但是迁移数据时需要锁定不能写入
    //db.lock(scope).then(() => {
    // 一旦正在锁定会直接抛出异常，放弃所有提交，不会进入提交过程
    //   这里错定还是靠后，有可能用户已经加载了实体，然后升级实体，然后之前的实体提交
    // 这里问题可以解决，需要提交前校验一下实体版本
    debug('commit %s entities...', repository.entityType.name, entities.length);
    repository.commitAll(entities, err => {
      debug('commit finished')
      if (err) {
        reject(err);
        return;
      }
      resolve();
      //  db.unlock(scope).then(resolve).catch(reject);
    });
    //}).catch(reject);
  });
}

const getRep = (entityName) => {
  return reps[entityName];
}

const repWapper = (repository, ns) => {
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
        entityTypes: Array.from(new Set(conflicts.map(it => it.constructor.name))).join(','),
        ids: conflicts.map(it => it.id).join(',')
      }))
    }
    const crosses = entities.filter(it => it._ns !== ns);
    if (crosses.length > 0) {
      debug(ns, crosses);
      throw new Error(t('{{entityTypes}}实体{{entityNss}}跨域{{ns}}冲突', {
        ns,
        entityTypes: Array.from(new Set(crosses.map(it => it.constructor.name))).join(','),
        entityNss: crosses.map(it => it._ns).join(',')
      }))
    }
    entities = entities.filter(it => commits.every(cit => cit.id !== it.id));
    if (entities.length > 0) {
      debug('%s add commint...', ns || '**', entities.map(it => it.id));
      commits.push(...entities);
    }
  }
  return {
    get namespace() {
      return ns;
    },
    get primitive() {
      return repository;
    },
    get entityType() {
      return repository.entityType
    },
    get: async (...ids) => {
      // debug('get %s...', repository.entityType.name, ...ids);
      if (ids.length == 0) {
        return null;
      }
      ids.forEach(id => {
        if (!id) throw new BizError(t('实体id无效，无法查找实体'));
      })
      // 要是有新增没有commit的从commits中查找
      const entities = await Promise.all(ids.map(async id => commits.find(it => it.id === id) || await findRep(repository, id)));
      addCommints(...entities);
      // debug('get results:', entities.length)
      return ids.length === 1 ? entities[0] : entities;
    },
    getAll: async (...ids) => {
      const entities = (await findAllRep(repository, ids)).filter(it => it).map(it => commits.find(cit => cit.id === it.id) || it);
      addCommints(...entities);
      return entities;
    },
    getByIndex: async (index, value) => {
      let entity = commits.find(it => it[index] === value);
      if (!entity) {
        entity = await getByIndex(repository, index, value);
        addCommints(entity);
      }
      return entity;
    },
    create: async (params) => {
      const entity = await repository.entityType.create(params, {
        ns
      });
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
      await commitAll(repository, commits);
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
  create: (EntityType, options = {}) => {
    // 这里不能缓存，要不fields没有更新机制
    // if (reps[entityName]){
    //   return reps[entityName];
    // }
    //return new Promise((resolve, reject) => {
    const indices = EntityType.fields.filter(({
      index,
      rules
    }) => index || (rules && rules.unique)).map(it => it.key);
    debug('%s indices...', EntityType.name, indices);
    const repository = new Repository(EntityType, {
      ...options,
      // 仓库增加ns，不同的租户存储不同的集合中
      collection: (options.ns ? (options.ns + '.') : '') + EntityType.name,
      indices: options.ns ? [...indices, '_ns'] : indices
    });
    //reps[EntityType.name] = repository;
    const ret = repWapper(repository, options.ns);
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
