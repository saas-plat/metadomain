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

exports.Migration = class Migration {

  async up(entityTypes, rules, opts = {
    checkLock: true,
    autoLock: false
  }) {
      const ruleset = new RuleSet('up_' + entityTypes.map(it => it.name).join('_'), rules, {
        Action: MigrationAction
      });
      for (const entityType of entityTypes) {
        debug('start %s migration...', entityType.name);
        await this._migrationEvents(entityType, ruleset);
      } 
  }

  async _migrationEvents(entityType, ruleset) {
    const scopes = Array.from(new Set([entityType.basetype, entityType.type, entityType.name, entityType.basename, '']));
    const entityName = entityType.name;
    const snapshotCollectionName = util.format('%s.snapshots', entityName);
    const snapshots = db.collection(snapshotCollectionName);
    const eventCollectionName = util.format('%s.events', entityName);
    const events = db.collection(eventCollectionName);
    const repository = Repository.create(entityType).primitive;
    const batch = 100;
    const cur = await events.find().sort({
      id: 1,
      version: 1
    }).batchSize(batch);
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
      await ruleset.execute([
        ...scopes.map(action => (new MigrationAction(action, eit))),
      ]);
      // 需要更新
      // 每batch更新一次，要是更新存在风险，可能失败以后可以改成插入+删除模式
      if (!_.eq(eit.data, old)) {
        ups.push(eit);
        neddrebuild = true;
      }
      if (ups.length >= batch) {
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
