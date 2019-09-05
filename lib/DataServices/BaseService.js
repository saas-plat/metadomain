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

exports.BaseService = class BaseService {
  constructor(Model, options = {}) {
    this.Model = Model;
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
