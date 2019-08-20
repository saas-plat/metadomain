const {
  BaseService
} = require('./BaseService');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');

// 层级数据
// 保存时需要加载父子数据对象
const LevelService = exports.LevelService = class LevelService extends BaseService {

  async _loadData(data) {
    const parent = data[this.mapping.parent];
    const data = super._handleData(data);
    if (!data[this.mapping.parent] && parent && parent.id) {
      throw new BizError(t('父级数据不存在'));
    }
    return data;
  }

}

LevelService.mappings = {
  parent: 'parent'
}
