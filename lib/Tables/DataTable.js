const {
  BaseTable
} = require('./BaseTable');
const {
  createMappingProps
} = require('../util');
const {
  t
} = require('../i18n');
const debug = require('debug')('saas-plat:DataTable');

// 基本的数据查询对象，对业务实体数据进行记录生成一个数据列表
const DataTable = exports.DataTable = class DataTable extends BaseTable {
  static async getById(data) {
    createMappingProps(data, this.schema.get('mappings'));
    if (!data.entityId) {
      debug(data)
      throw new Error(t('业务实体Id不存在，无法查找'));
    }
    const doc = await this.findOne({
      [this.schema.get('mappings').entityId || 'entityId']: data.entityId
    });
    return doc;
  }

  static async upsert(data) {
    createMappingProps(data, this.schema.get('mappings'));
    if (!data.entityId) {
      debug(data)
      throw new Error(t('业务实体Id不存在，无法记录数据'));
    }
    const doc = await this.findOne({
      [this.schema.get('mappings').entityId || 'entityId']: data.entityId
    }) || new this(data);
    delete data[this.schema.get('mappings').entityId || 'entityId'];
    debug('upsert %o', data);
    doc.set(data);
    await doc.save();
    return doc;
  }

  static async delete(data) {
    data = createMappingProps(data, this.schema.get('mappings'));
    if (!data.entityId) {
      throw new Error(t('业务实体Id不存在，无法删除数据'));
    }
    const doc = await this.findOne({
      [this.schema.get('mappings').entityId || 'entityId']: data.entityId
    });
    if (!doc) {
      return;
    }
    await doc.remove();
    return doc;
  }
}

DataTable.fields = {
  ...BaseTable.fields,
  // 实体Id
  entityId: 'string',
  ts: 'string',
}
