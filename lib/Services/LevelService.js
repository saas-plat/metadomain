const {
  BaseService
} = require('./BaseService');
const {
  LevelData
} = require('../Entities');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const debug = require('debug')('saas-plat:LevelService');

// 层级数据
// 保存时需要递归加载父子数据对象
const LevelService = exports.LevelService = class LevelService extends BaseService {

  async _reduceParent(entity) {
    const parent = entity.parent;
    if (parent) {
      const parentEntity = await this.repository.get(parent.id);
      if (this.references.indexOf(parentEntity) === -1) {
        this.references.push(parentEntity);
      }
      await this._reduceParent(parentEntity);
      entity.parent = parentEntity;
    }
  }

  async _reduceChilds(entity) {
    if (entity.childs) {
      const childEntites = await Promise.all(entity.childs.map(async (it) => {
        return await this.repository.get(it.id);
      }));
      for (const childEntity of childEntites) {
        if (this.references.indexOf(childEntity) === -1) {
          this.references.push(childEntity);
        }
      }
      for (const child of childEntites) {
        await this._reduceChilds(child);
      }
      entity.childs = childEntites;
    }
  }

  async _loadData(data, ...other) {
    const formatData = await super._loadData(data, ...other);
    for (const entity of this.references) {
      if (entity instanceof LevelData) {
        // 需要加载parent.parent...
        await this._reduceParent(entity);
        await this._reduceChilds(entity);
      }
    }
    return formatData;
  }

  async _afterSave(entity) {
    // 更新parent的childs
    if (entity.parent) {
      const parentEntity = await this.repository.get(entity.parent.id);
      if (parentEntity.childs.every(it => it.id !== entity.id)) {
        debug('save childs...')
        await this.save({
          id: parentEntity.id,
          ts: parentEntity.ts,
          childs: parentEntity.childs.concat(entity).map(it => ({
            id: it.id
          }))
        })
      }
    }
  }

}
