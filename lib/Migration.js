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

class Event {
  constructor(name, data) {
    readonly(this, 'name', name);
    readonly(this, 'type', data._type);
    readonly(this, 'id', data.id);
    readonly(this, 'method', data.method);
    this.data = data.data;
  }
}

exports.Migration = class Migration {
  constructor(scope = {}) {
    this.scopeFilter = Object.keys(scope).map(key => ([key.startsWith('_') ? key : '_' + key, scope[key]]));

  }

  async lock() {
    await db.lock(this.scopeFilter);
    this.isLocked = true;
  }

  async unlock() {
    await db.unlock(this.scopeFilter);
    this.isLocked = false;
  }

  async up(entityTypes, rules, opts = {
    checkLock: true,
    autoLock: false
  }) {
    if (!this.isLocked && opts.checkLock) {
      throw new Error(t('数据范围没有锁定无法升级'))
    }
    let upLock;
    if (!this.isLocked && opts.autoLock) {
      await this.lock();
      upLock = true;
    }
    try {
      const ruleset = new RuleSet('up_' + entityTypes.map(it => it.name).join('_'), rules, {
        Event
      });
      for (const entityType of entityTypes) {
        await this._migrationEvents(entityType, ruleset);
      }
    } catch (e) {
      throw e;
    } finally {
      if (upLock) {
        await this.unlock();
        unlock = false;
      }
    }
  }

  async _migrationEvents(entityType, ruleset) {
    const actions = [entityType.constructor.name, entityType.constructor.name + '.' + entity.name, entityType.name]
    const entityName = entityType.name;
    const snapshotCollectionName = util.format('%s.snapshots', entityName);
    const snapshots = db.collection(snapshotCollectionName);
    const eventCollectionName = util.format('%s.events', entityName);
    const events = db.collection(eventCollectionName);
    const filter = this.scopeFilter.reduce((ret, it) => ({
      ['_' + it[0]]: it[1]
    }), {});
    const es = await events.find({
        _type: entityName,
        ...filter
      }).sort({
        id: 1,
        version: 1
      })
      .toArray();
      // 迁移事件
    for (const eit of es) {
      await ruleset.execute([
        ...actions.map(action => (new Event(action + '.migration', eit))),
      ]);
    }
    // 重建快照
    const ids = Array.from(new Set(es.map(it => it.id)));
    const snaps = snapshots.deleteMany({
      id: {
        $in: ids
      }
    });
    const repository = Repository.create(entityType);
    for (const id of ids) {
      const entity = await repository.get(id);
      await this._rebuildSnapshots(repsitory, entity);
    }
  }

  _rebuildSnapshots(repository, entity) {
    return new Promise((resolve, reject) => {
      repsitory._commitSnapshots(entity, {}, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
