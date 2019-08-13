const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  BaseService
} = require('./BaseService');

exports.SumTableService = class SumTableService extends BaseService {


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
