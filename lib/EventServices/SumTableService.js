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
  parseData
} = require('../util');

const defaults = {
  //idKey: 'id',
  detailKey: 'details',
  detailIdKey: 'id',
  entityMapping: null,
  detailMapping: null,
}

const mapto = (data, includes={}, excludes={}) => {
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
  constructor(model, options) {
    super(model);
    this.options = {
      ...defaults,
      ...options
    };
  }

  async onSaved({
    id,
    ...data
  }) {
    data = parseData(data);
    const {
      detailKey,
      detailIdKey,
      entityMapping = createDefaultMappings(data, [detailKey]),
      detailMapping = createDefaultMappings(data[detailKey]),
    } = this.options;
    const headData = mapto(data, entityMapping, {
      id: 1,
      [detailKey]: 1,
      ...detailMapping
    });
    if (detailKey in data) {
      const details = data[detailKey];
      if (!Array.isArray(details)) {
        console.error('not support details', detailKey, details);
        return;
      }
      // 删除已经删除的明细
      await this.model.deleteMany({
        id,
        detailId: {
          $nin: details.map(it => it[detailIdKey])
        }
      });
      // 更新或添加明细
      for (const it of details) {
        const detailData = mapto(it, detailMapping, {
          [detailIdKey]: 1
        });
        if (Object.keys(headData).length <= 0) {
          break;
        }
        await this.model.updateOne({
          // 实体id
          id,
          // 固定的明细id
          detailId: it[detailIdKey],
        }, {
          // 表头
          ...headData,
          // 表体明细
          ...detailData,
          // 固定字段放后边
          id,
          detailId: it[detailIdKey],
        }, {
          upsert: true
        });
      }
    }
    // 更新表头需要把所有明细都更新
    if (Object.keys(headData).length > 0) {
      await this.model.updateMany({
        id
      }, {
        id,
        ...headData,
      });
    }
  }

  async onStatusUpdated({
    id,
    ...data
  }) {
    const {
      detailKey,
      detailIdKey,
      entityMapping = createDefaultMappings(data, [detailKey]),
      detailMapping = createDefaultMappings(data[detailKey]),
    } = this.options;
    const headData = mapto(data, entityMapping, {
      id: 1,
      [detailKey]: 1,
      ...detailMapping
    });
    await this.model.updateMany({
      id,
    }, {
      ...headData,
      id,
    });
  }

  async onDeleted({
    id
  }) {
    await this.model.deleteMany({
      id
    })
  }
}
