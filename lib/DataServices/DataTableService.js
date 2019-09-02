const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  BaseService
} = require('./BaseService');

const debug = require('debug')('saas-plat:DataTableService');

exports.DataTableService = class DataTableService extends BaseService {

  async onSaved(data) {
    data = await this._loadData(data);
    const doc = await this.Model.upsert(data);
    return doc;
  }

  async onStatusUpdated(data) {
    data = await this._loadData(data);
    const doc = await this.Model.upsert(data);
    return doc;
  }

  async onDeleted(data) {
    data = await this._loadData(data);
    const doc = await this.Model.delete(data);
    return doc;
  }
}
