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

const defaults = {
  idKey: 'id',
  detailKey: 'details',
  detailIdKey: 'id',
  // entityMapping: undefined,
  // detailMapping: undefined,
}

const mapto = (data, includes = {}, excludes = {}) => {
  return Object.keys(includes).reduce((obj, key) => {
    if (key in excludes) {
      return obj;
    }
    return {
      ...obj,
      [key]: data[includes[key]]
    }
  }, {});
}

const createDefaultMappings = (data, excludes = []) => {
  return Object.keys(data).reduce((mapping, key) => {
    if (excludes.indexOf(key) > -1) {
      return mapping;
    }
    return {
      ...mapping,
      [key]: key
    }
  });
}

exports.SumTableService = class SumTableService extends BaseService {
  constructor(Model, options) {
    super(Model, {
      ...defaults,
      ...options
    });
  }

  async onSaved(data) {
    data = await this._loadData(data);
    const {
      idKey,
      detailKey,
      detailIdKey,
      entityMapping = createDefaultMappings(data, [detailKey]),
      detailMapping = createDefaultMappings(data[detailKey]),
    } = this.options;
    const headData = mapto(data, entityMapping, {
      [idKey]: 1,
      [detailKey]: 1,
      ...detailMapping
    });

    // 删除已经删除的明细
    if (detailKey in data) {
      const details = data[detailKey];
      if (!Array.isArray(details)) {
        throw new Error(t('不支持的{{name}}明细字段{{type}}类型'), {
          name: detailKey,
          type: typeof details
        });
      }
      await this.Model.deleteNIn(data[idKey], ...data[detailKey].map(it => (parseUserData({
        detailId: it[detailIdKey]
      })), this.Model.schema.mappings));
      // 更新或添加明细
      for (const it of details) {
        const detailData = mapto(it, detailMapping, {
          [detailIdKey]: 1
        });
        await this.Model.upsert(parseUserData({
          // 表头
          ...headData,
          // 表体明细
          ...detailData,
          // 固定字段放后边
          id: data[idKey],
          detailId: it[detailIdKey],
        }, this.Model.schema.mappings));
      }
    }
    // 更新表头需要把所有明细都更新
    if (Object.keys(headData).length > 0) {
      await this.Model.upsert(parseUserData({
        ...headData,
        id: data[idKey],
      }));
    }
  }

  async onStatusUpdated(data) {
    await this.onSaved(data);
  }

  async onDeleted(data) {
    data = await this._loadData(data);
    const {
      idKey
    } = this.options;
    await this.Model.deleteMany(parseUserData({
      id: data[idKey]
    }, this.Model.schema.mappings))
  }
}
