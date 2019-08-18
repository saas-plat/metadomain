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

exports.UnionTableService = class UnionTableService extends BaseService {

  async onSaved({
    id,
    ...data
  }) {
    data = parseData(data);
  }

  async onStatusUpdated({
    id,
    ...data
  }) {
    data = parseData(data);
  }

  async onDeleted({
    id
  }) {

  }

}
