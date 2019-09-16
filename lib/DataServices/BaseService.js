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
    data = parseUserData(data, this.Model.schema.get('mappings'));
    return data;
  }
}
