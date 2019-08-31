const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  BaseService
} = require('./BaseService');
const {
  parseBigData
} = require('../util');

exports.DataTableService = class DataTableService extends BaseService {

  async onSaved({
    id,
    ...data
  }) {
    if (!id) {
      console.error(t('业务实体id不存在，无法记录数据'));
      return;
    }
    data = parseBigData(data);
    return await this.model.upsert({
      id,
      ...data
    });
  }

  async onStatusUpdated({
    id,
    ...data
  }) {
    if (!id) {
      console.error(t('业务实体id不存在，无法更新状态'));
      return;
    }
    data = parseBigData(data);
    return await this.model.upsert({
      id,
      ...data
    });
  }

  async onDeleted({
    id
  }) {
    if (!id) {
      console.error(t('业务实体id不存在，无法删除'));
      return;
    }
    return await this.model.delete({
      id,
    });
  }
}
