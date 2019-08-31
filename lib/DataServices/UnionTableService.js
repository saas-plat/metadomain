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

exports.UnionTableService = class UnionTableService extends BaseService {

  async onSaved({
    id,
    ...data
  }) {
    data = parseBigData(data);
  }

  async onStatusUpdated({
    id,
    ...data
  }) {
    data = parseBigData(data);
  }

  async onDeleted({
    id
  }) {

  }

}
