const {
  BaseTable
} = require('./BaseTable');

// 对明细进行汇总的数据对象
const SumTable = exports.SumTable = class SumTable extends BaseTable {
  async deleteNIn(id, ...data) {
    if (!id) {
      throw new Error(t('业务实体id不存在，无法更新明细表数据'));
    }
    data.forEach(it => createMappingProps(it, this.schema.mappings));
    await this.Model.deleteMany({
      [this.schema.mappings.id || 'id']: id,
      [this.schema.mappings.detailId || 'detailId']: {
        $nin: data.map(it => it.detailId)
      }
    });
  }

  async upsert(data) {
    createMappingProps(data, this.schema.mappings);
    if (!data.id) {
      throw new Error(t('业务实体id不存在，无法更新明细表数据'));
    }
    const query = {
      [this.schema.mappings.id || 'id']: data.id,
      [this.schema.mappings.detailId || 'detailId']: data.detailId
    }
    delete data[this.schema.mappings.id || 'id'];
    delete data[this.schema.mappings.detailId || 'detailId'];
    const doc = {
      ...query,
      ...data
    }
    await this.Model.updateOne(query, doc, {
      upsert: true
    });
  }
}

SumTable.fields = {
  ...BaseTable.fields,
  // 实体的id
  id: 'string',
  // 明细行的id
  detailId: 'string',
}
