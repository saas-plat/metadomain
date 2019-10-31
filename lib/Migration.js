const db = require('./db');
const {
  t
} = require('./i18n');
const {
  RuleSet
} = require('./RuleSet');
const util = require('util');
const {
  readonly,
  unset,
  omitByDeep,
  dropCollection
} = require('./util');
const {
  Repository
} = require('./Repository');
const debug = require('debug')('saas-plat:Migration');
const {
  Event,
  MigrationAction
} = require('./Event');
const _ = require('lodash');
const moment = require('moment');
const {
  BizError
} = require('./Error');

const BATCH = 10;

exports.Migration = class Migration {

  constructor(migrationTypes, newTypes) {
    this.migrationTypes = migrationTypes;
    this.newTypes = newTypes;
  }

  async dropback({
    backId
  } = {}) {
    for (const entityRep of this.migrationTypes) {
      debug('drop %s backup...', entityRep.entityType.name, (backId || this.backId));
      const repository = entityRep.primitive;
      const events = repository.events;
      // 恢复数据
      const backups = db.collection(events.collectionName + '.' + (backId || this.backId));
      await dropCollection(backups);
    }
  }

  async backup({
    force = false
  } = {}) {
    this.backId = moment().format('YYYYMMDDHHmmss');
    for (const entityRep of this.migrationTypes) {
      const repository = entityRep.primitive;
      // 只需要备份event库，快照会删除重建
      const events = repository.events;
      const backups = db.collection(events.collectionName + '.' + this.backId);
      debug('start %s backup...', backups.collectionName);
      const exists = await backups.count();
      if (exists > 0 && !force) {
        throw new BizError(t('备份失败，集合已经存在且不为空'));
      }
      await dropCollection(backups);
      // 本地克隆，不带索引
      const inserts = [];
      let counter = 0;
      const cur = events.find().batchSize(BATCH);
      let it = await cur.next();
      while (it) {
        inserts.push(it);
        if (inserts.length >= BATCH) {
          counter += inserts.length;
          await backups.insertMany(inserts);
          inserts.length = 0;
        }
        it = await cur.next();
      }
      if (inserts.length > 0) {
        counter += inserts.length;
        await backups.insertMany(inserts);
        inserts.length = 0;
      }
      debug('backup %s count', repository.entityType.name, counter);
    }
    return this.backId;
  }

  async rollback({
    backId,
    dropBackupCollection = true
  } = {}) {
    for (const entityRep of this.migrationTypes) {
      debug('start %s rollback...', entityRep.entityType.name, (backId || this.backId));
      const repository = entityRep.primitive;
      // 索引也需要drop了，因为实体不同版本的index可能不同
      const snapshots = repository.snapshots;
      const events = repository.events;
      await dropCollection(snapshots);
      await dropCollection(events);
      // 重建索引
      await entityRep.init();
      // 恢复数据
      const backups = db.collection(events.collectionName + '.' + (backId || this.backId));
      const inserts = [];
      let counter = 0;
      const cur = backups.find().batchSize(BATCH);
      let it = await cur.next();
      while (it) {
        inserts.push(it);
        if (inserts.length >= BATCH) {
          await events.insertMany(inserts);
          counter += inserts.length;
          inserts.length = 0;
        }
        it = await cur.next();
      }
      if (inserts.length > 0) {
        await events.insertMany(inserts);
        counter += inserts.length;
        inserts.length = 0;
      }
      debug('rollback %s count', entityRep.entityType.name, counter);
      // 重建快照
      // 升级时可能删除快照后没有重建等情况
      // 注意：这里的快照是升级前版本的快照
      const getEntity = util.promisify(repository.get.bind(repository));
      const rebuildSnapshots = async (id) => {
        debug('rebuild %s(%s) snapshots...', entityRep.entityType.name, id)
        const snaps = await snapshots.deleteMany({
          id
        });
        const entity = await getEntity(id);
        if (entity) {
          await this._rebuildSnapshotsPromise(repository, entity);
          debug('rebuild finished.')
        } else {
          debug('rebuild %s(%s) skip!', entityType.name, id)
        }
      }
      const curReBuild = await events.find().sort({
        id: 1,
        version: 1
      }).batchSize(BATCH);
      let eit = await curReBuild.next();
      let lastid;
      while (eit) {
        // 重建快照
        if (!lastid) {
          lastid = eit.id;
        }
        if (lastid !== eit.id) {
          lastid = eit.id;
          await rebuildSnapshots(lastid);
        }
        eit = await curReBuild.next();
      }
      if (dropBackupCollection) {
        await dropCollection(backups);
      }
    }
  }

  async up(rules, opts = {
    checkLock: true,
    autoLock: false
  }) {
    this.upCounter = 0;
    const ruleset = new RuleSet('up_' + this.migrationTypes.map(rep => rep.entityType.name).join('_'), rules, {
      Action: MigrationAction,
      Event,
      ...(this.newTypes.reduce((reps, entityRep) => {
        reps[entityRep.entityType.name + 'Repository'] = entityRep;
        return reps;
      }, {}))
    });
    for (const entityRep of this.migrationTypes) {
      debug('start %s migration...', entityRep.entityType.key);
      await this._migrationEvents(entityRep, ruleset);
    }
  }

  async _migrationEvents(entityRep, ruleset) {
    const entityType = entityRep.entityType;
    const repository = entityRep.primitive;
    const snapshots = repository.snapshots;
    const events = repository.events;
    const cur = await events.find().sort({
      id: 1,
      version: 1
    }).batchSize(BATCH);
    // 迁移事件
    const ups = [];
    const dels = [];
    let lastid;
    let neddrebuild;
    const bulkUpdate = async () => {
      debug('bulk update...', ups.length, dels.length);
      await events.bulkWrite([
        ...dels.map(uit => ({
          deleteOne: {
            filter: {
              _id: uit._id
            }
          }
        })),
        ...ups.map(uit => ({
          updateOne: {
            filter: {
              _id: uit._id
            },
            update: {
              $set: {
                data: uit.data
              }
            }
          }
        }))
      ]);
      this.upCounter += ups.length;
    }
    const getEntity = util.promisify(repository.get.bind(repository));
    const rebuildSnapshots = async (id) => {
      debug('rebuild %s(%s) snapshots...', entityType.name, id)
      const snaps = await snapshots.deleteMany({
        id
      });
      const entity = await getEntity(id);
      if (entity) {
        await this._rebuildSnapshotsPromise(repository, entity);
        debug('rebuild finished.')
      } else {
        debug('rebuild %s(%s) skip!', entityType.name, id)
      }
    }
    let eit = await cur.next();
    while (eit) {
      // 执行升级
      debug('execute %s migration rules...', eit.id);
      const old = _.cloneDeep(eit.data);
      const scopeActions = eit._ns ? [
        eit._ns + '.' + entityType.name,
        eit._ns + '.' + entityType.basename,
        eit._ns
      ] : [];
      const evt = new Event(_.cloneDeepWith(old, value => {
        // TODO 类型转换
        return value;
      }));
      await ruleset.execute([
        ...([entityType.name, entityType.basename, ''].concat(scopeActions)
          .map(action => (new MigrationAction(action, eit)))),
        evt
      ]);
      // 需要更新
      const newEntityRep = this.newTypes.find(rep => rep.entityType.name === entityType.name);
      if (!newEntityRep) {
        // 删除对象
        dels.push(eit);
      } else {
        // 更新对象
        const poco = _.toPlainObject(evt);
        const rmFields = unset(poco, newEntityRep.entityType.fields);
        //debug(poco)
        debug('unset data:', rmFields);
        if (!_.isEqual(poco, old)) {
          // debug(old, poco)
          eit.data = omitByDeep(poco, rmFields);
          ups.push(eit);
          neddrebuild = true;
        }
      }
      if ((ups.length + dels.length) >= BATCH) {
        await bulkUpdate();
        ups.length = 0;
      }
      // 重建快照
      if (!lastid) {
        lastid = eit.id;
      }
      if (lastid !== eit.id) {
        lastid = eit.id;
        if (neddrebuild) {
          await rebuildSnapshots(lastid);
          neddrebuild = false;
        }
      }
      eit = await cur.next();
    }
    if (ups.length > 0) {
      debug('bulk update...', ups.length);
      await bulkUpdate();
      ups.length = 0;
    }
    if (neddrebuild) {
      await rebuildSnapshots(lastid);
      neddrebuild = false;
    }
  }

  _rebuildSnapshotsPromise(repository, entity) {
    return new Promise((resolve, reject) => {
      repository._commitSnapshots(entity, {}, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
