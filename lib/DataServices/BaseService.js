const _ = require('lodash');
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
      entityMapping: {},
      ...options
    };
  }

  async _loadData(data) {
    data = parseBigData(data);
    //   需要把实体的mappings映射成数据对象的
    // 默认Table的mappings和Entity的mappings一致，特殊的需要在entityMapping设置
    // 比如把entity.id(例如别名ID) => data.entityId(别名ID)
    data = parseUserData(data, _.merge(this.Model.schema.get('mappings'),this.options.entityMapping));
    return data;
  }
}
