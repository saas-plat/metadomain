const {
  BaseService
} = require('./BaseService');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const debug = require('debug')('saas-plat:LevelService');

// 层级数据
// 保存时需要加载父子数据对象
const LevelService = exports.LevelService = class LevelService extends BaseService {

  async _reduceParent(entity) {
    if (!entity) {
      return;
    }
    const parent = entity[this.mapping.parent];
    if (parent) {
      entity[this.mapping.parent] = await this.repository.get(parent.id);
      await this._reduceParent(entity[this.mapping.parent]);
    }
  }

  async _loadData(data, ...other) {
    const parent = data[this.mapping.parent];
    const formatData = await super._loadData(data, ...other);
    const parentEntity = formatData[this.mapping.parent];
    if (!parentEntity && parent && parent.id) {
      throw new BizError(t('父实体不存在'));
    }
    // 需要加载parent.parent...
    await this._reduceParent(parentEntity);
    return formatData;
  }

}

LevelService.mapping = {
  ...BaseService.mapping,
  parent: 'parent'
}
