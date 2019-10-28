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
} = require('./util');
const {
  Repository
} = require('./Repository');
const debug = require('debug')('saas-plat:Migration');
const {
  MigrationAction
} = require('./Event');
const _ = require('lodash');
const moment = require('moment');
const {
  BizError
} = require('./Error');

const BATCH = 10;

exports.Migration = class Migration {

  constructor(...entityTypes) {
    this.entityTypes = entityTypes;
  }

  async getMigrationEntityTypes(entityTypes){
    entityTypes = entityTypes || this.entityTypes;
    // 从升级的对象计算所有需要版本的对象类型
    // 对象可能不是一对一的，比如合并对象和拆分对象
    // 返回的老版本对象，用于备份和恢复
    
  }

  async backup({
    force = false
  } = {}) {
    this.backId = moment().format('YYYYMMDDHHmmss');
    const migrationEntityTypes = await this.getMigrationEntityTypes();
    for (const entityType of migrationEntityTypes) {
      const entityName = entityType.name;
      // 只需要备份event库，快照会删除重建
      // const snapshotCollectionName = util.format('%s.snapshots', entityName);
      // const snapshots = db.collection(snapshotCollectionName);
      const eventCollectionName = util.format('%s.events', entityName);
      const events = db.collection(eventCollectionName);
      const backups = db.collection(eventCollectionName + '.' + this.backId);
      debug('start %s backup...', eventCollectionName + '.' + this.backId);
      const exists = await backups.count();
      if (exists > 0 && !force) {
        throw new BizError(t('备份失败，集合已经存在且不为空'));
      }
      exists && await backups.drop();
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
      debug('backup %s count', entityType.name, counter);
    }
    return this.backId;
  }

  async rollback({
    backId,
    dropBackupCollection = true
  } = {}) {
    const migrationEntityTypes = await this.getMigrationEntityTypes();
    for (const entityType of migrationEntityTypes) {
      debug('start %s rollback...', entityType.name, (backId || this.backId));
      const entityName = entityType.name;
      // 重建索引
      // 索引也需要drop了，因为实体不同版本的index可能不同
      const eventCollectionName = util.format('%s.events', entityName);
      const dropevents = db.collection(eventCollectionName);
      await dropevents.count() > 0 && await dropevents.drop();
      const repository = Repository.create(entityType).primitive;
      const events = repository.events;
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
      debug('rollback %s count', entityType.name, counter);
      // 重建快照
      // 升级时可能删除快照后没有重建等情况
      // 注意：这里的快照是升级前版本的快照
      const snapshots = repository.snapshots;
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
      if (dropBackupCollection && (await backups.count()) > 0) {
        await backups.drop();
        debug('drop backups',backups.collectionName);
      }
    }
  }

  async up(rules, opts = {
    checkLock: true,
    autoLock: false
  }) {
    const ruleset = new RuleSet('up_' + this.entityTypes.map(it => it.name).join('_'), rules, {
      Action: MigrationAction
    });
    for (const entityType of this.entityTypes) {
      debug('start %s migration...', entityType.name);
      await this._migrationEvents(entityType, ruleset);
    }
  }

  async _migrationEvents(entityType, ruleset) {
    const entityName = entityType.name;
    const snapshotCollectionName = util.format('%s.snapshots', entityName);
    const snapshots = db.collection(snapshotCollectionName);
    const eventCollectionName = util.format('%s.events', entityName);
    const events = db.collection(eventCollectionName);
    const repository = Repository.create(entityType).primitive;
    const cur = await events.find().sort({
      id: 1,
      version: 1
    }).batchSize(BATCH);
    // 迁移事件
    const ups = [];
    let lastid;
    let neddrebuild;
    const bulkUpdate = async () => {
      debug('bulk update...', ups.length);
      await events.bulkWrite(
        ups.map(uit => ({
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
      );
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
      await ruleset.execute([
        ...([entityType.name, entityType.basename, ''].concat(scopeActions).map(action => (new MigrationAction(action, eit)))),
      ]);
      // 需要更新
      // 每BATCH更新一次，要是更新存在风险，可能失败以后可以改成插入+删除模式
      if (!_.eq(eit.data, old)) {
        ups.push(eit);
        neddrebuild = true;
      }
      if (ups.length >= BATCH) {
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
