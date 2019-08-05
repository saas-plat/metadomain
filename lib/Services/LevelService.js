const {BaseService} = require('./BaseService');
const {BizError} = require('../Error');
const {t} = require('../i18n');

// 层级数据
// 保存时需要加载父子数据对象
exports.LevelService = class LevelService extends BaseService {

  async _handleData(data) {
    const {
      pid,
      ...other
    } = data;
    const parent = pid && await this.repository.get(pid);
    if (pid && !parent){
      throw new BizError(t('父级数据不存在'));
    }
    return {
      pid,
      parent,
      ...other
    };
  }

}
