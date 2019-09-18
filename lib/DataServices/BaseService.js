const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  parseBigData,
  parseUserData
} = require('../util');
const {
  MetaTable
} = require('../MetaTable');

const createModelFinder = (Model) => {
  return async (name) => {
    return await Model.getReferenceModel(name);
  };
}

exports.BaseService = class BaseService {
  constructor(Model, findModel = createModelFinder(Model), options = {}) {
    this.Model = Model;
    this.findModel = findModel;
    this.options = {
      ...options
    };
  }

  async _loadData(data) {
    data = parseBigData(data);
    // TODO 这里的mappings不对，需要把实体的mappings映射成数据对象的
    // 比如把entity.id(例如别名ID) => data.entityId(别名ID)
    data = parseUserData(data, this.Model.schema.get('mappings'));
    return data;
  }
}
