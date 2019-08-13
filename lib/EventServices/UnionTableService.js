const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  BaseService
} = require('./BaseService');

exports.UnionTableService = class UnionTableService extends BaseService {

  async onSaved({
    id,
    ...data
  }) {

  }

  async onStatusUpdated({
    id,
    ...data
  }) {

  }

  async onDeleted({
    id
  }) {

  }

}
