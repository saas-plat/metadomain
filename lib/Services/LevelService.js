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

  async _reduceParent(data, entity) {
    const parent = entity.parent;
    if (parent) {
      const parentEntity = await this.repository.get(parent.id);
      if (this.references.indexOf(parentEntity) === -1) {
        this.references.push(parentEntity);
      }
      const pdata = {};
      await this._reduceParent(pdata, parentEntity);
      // 这里不能修改实体属性,要是修改需要创建新参数对象
      // 要不会导致实体提交时直接保存到db
      data.parent = {
        ...parentEntity,
        ...pdata
      };
    }
  }

  async _reduceChilds(data, entity) {
    if (entity.childs) {
      const childEntites = await Promise.all(entity.childs.map(async (it) => {
        return await this.repository.get(it.id);
      }));
      for (const childEntity of childEntites) {
        if (this.references.indexOf(childEntity) === -1) {
          this.references.push(childEntity);
        }
      }
      const childDatas = [];
      for (const child of childEntites) {
        const childdata = {};
        await this._reduceChilds(childdata, child);
        childDatas.push({
          ...child,
          ...childdata
        });
      }
      data.childs = childDatas;
    }
  }

  async _handleReference(data, ...args) {
    const entity = await super._handleReference(data, ...args);
    if (entity instanceof LevelData) {
      // 需要加载parent.parent...
      await this._reduceParent(data, entity);
      await this._reduceChilds(data, entity);
    }
    return entity;
  }

  async _afterSave(entity) {
    // 更新parent的childs
    if (entity.parent) {
      const parentEntity = await this.repository.get(entity.parent.id);
      if (parentEntity.childs.every(it => it.id !== entity.id)) {
        const childs = parentEntity.childs.concat(entity);
        debug('save childs...', childs.length);
        await this.save({
          id: parentEntity.id,
          ts: parentEntity.ts,
          childs: childs.map(it => ({
            id: it.id
          }))
        })
      }
    }
  }

}
