const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  BaseService
} = require('./BaseService');
const _ = require('lodash');
const mongoose = require('mongoose');

const debug = require('debug')('saas-plat:DataTableService');

exports.DataTableService = class DataTableService extends BaseService {

  async _handleReference(schema, data) {
    const keys = Object.keys(schema.paths);
    for (const path of keys) {
      const type = schema.paths[path];
      //debug('check ref', path, type.instance)
      if (type instanceof mongoose.Schema.Types.ObjectId && type.options.ref) {
        debug('find ref', path, data[path]);
        if (data[path]) {
          const refModel = await this.findModel(type.options.ref);
          if (!refModel) {
            throw new Error(t('{{name}}数据对象查找失败！', {
              name: type.options.ref
            }));
          }
          const doc = await refModel.getById(data[path]);
          if (!doc) {
            throw new Error(t('引用{{name}}数据不存在！', {
              name: type.options.ref
            }));
          }
          debug('ref id', path, doc._id);
          data[path] = doc._id;
        }
      } else if (type instanceof mongoose.Schema.Types.DocumentArray) {
        debug('find array', path, data[path]);
        for (const it of _.toArray(data[path])) {
          await this._handleReference(type.schema, it);
        }
      }
    }
    return data;
  }

  async onSaved(data) {
    data = await this._loadData(data);
    // 处理引用数据关系的自动填充保存
    data = await this._handleReference(this.Model.schema, data);
    const doc = await this.Model.upsert(data);
    //   要是有自动填充_id还需要给引用的childs补充当前doc._id
    // 这里childs不是必须的
    // childs 不需要自动保存，实体一般会有添加的行为
    return doc;
  }

  async onStatusUpdated(data) {
    data = await this._loadData(data);
    data = await this._handleReference(this.Model.schema, data);
    const doc = await this.Model.upsert(data);
    return doc;
  }

  async onDeleted(data) {
    data = await this._loadData(data);
    const doc = await this.Model.delete(data);
    return doc;
  }
}
