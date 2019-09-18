const {
  BizError
} = require('../Error');
const {
  BaseTable
} = require('./BaseTable');
const {
  parseUserData,
  createMappingProps
} = require('../util');
const {
  t
} = require('../i18n');
const debug = require('debug')('saas-plat:SumTable');

// 对明细进行汇总的数据对象
const SumTable = exports.SumTable = class SumTable extends BaseTable {
  static async deleteNIn(entityId, ...data) {
    if (!entityId) {
      throw new BizError(t('业务实体Id不存在，无法更新明细表数据'));
    }
    data.forEach(it => createMappingProps(it, this.schema.get('mappings')));
    await this.deleteMany(parseUserData({
      entityId,
      detailId: {
        $nin: data.map(it => it.detailId)
      }
    }, this.schema.get('mappings')));
  }

  static async upsert(data) {
    createMappingProps(data, this.schema.get('mappings'));
    if (!data.entityId) {
      debug(data)
      throw new BizError(t('业务实体Id不存在，无法更新明细表数据'));
    }
    const query = parseUserData({
      entityId: data.entityId,
      detailId: data.detailId
    }, this.schema.get('mappings'))
    delete data[this.schema.get('mappings').entityId || 'entityId'];
    delete data[this.schema.get('mappings').detailId || 'detailId'];
    const doc = {
      ...query,
      ...data
    }
    //debug(data,query,doc)
    await this.updateOne(query, doc, {
      upsert: true
    });
  }
}

SumTable.fields = {
  ...BaseTable.fields,
  // 实体的id
  entityId: 'string',
  // 明细行的id
  detailId: 'string',
}
