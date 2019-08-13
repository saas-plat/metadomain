const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  BaseService
} = require('./BaseService');

exports.DataTableService = class DataTableService extends BaseService {

  async onSaved({
    id,
    ...data
  }) {
    const dataTable = await this.model.findOne({
      id
    }) || new this.table({
      id
    });
    this.model.merge(dataTable, data);
    await dataTable.save();
    return dataTable;
  }

  async onStatusUpdated({
    id,
    ...data
  }) {
    if (!id) {
      console.error(t('业务实体id不存在，无法更新状态'));
      return;
    }
    await this.onSaved({
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
    return await this.model.findOneAndRemove({
      id
    });
  }
}
