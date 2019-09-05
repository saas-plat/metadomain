const {
  t
} = require('./i18n');
const {
  RuleSet
} = require('./RuleSet');
const util = require('util');
const _ = require('lodash');
const {
  readonly,
  unset
} = require('./util');
const mongoose = require('mongoose');
const debug = require('debug')('saas-plat:DataMigration');
const {
  Action
} = require('./Event');
const conn = mongoose.connection;

exports.DataMigration = class DataMigration {

  async up(tableTypes, rules, opts = {
    checkLock: true,
    autoLock: false
  }) {
    const ruleset = new RuleSet('up_' + tableTypes.map(it => it.schema.get('name')).join('_'), rules, {
      Action: Action,
      Document: mongoose.Document,
    }, {
      ...tableTypes.reduce((obj, model) => ({
        ...obj,
        [model.name]: model
      }), {})
    });
    for (const tableType of tableTypes) {
      debug('start %s data migration...', tableType.name);
      await this._migrationTables(tableType, ruleset);
    }
  }

  async _migrationTables(model, ruleset) {
    const scopes = [model.schema.get('name'), model.schema.get('basename'), ''];
    if (model.schema.get('ns')) {
      scopes.push(model.schema.get('ns') + '.' + model.schema.get('name'), model.schema.get('ns') + '.' + model.schema.get('basename'));
    }
    const batchSize = 10;
    const cur = model.find({}, null, {
      batchSize
    }).cursor();
    // 迁移事件
    let doc = await cur.next();
    while (doc) {
      // 执行升级
      debug('execute data %s migration rules...', doc._id);
      // 所有已经删除的字段也会加载到doc
      const oldData = doc.toObject();
      // 需要手动删除多余字段
      const rmFields = unset(oldData, model.schema.get('fields'));
      debug('unset fields:', rmFields)
      await (model.collection.updateOne({
        _id: doc._id
      }, {
        $unset: rmFields
      }));
      await ruleset.execute([
        ...scopes.map(action => (new Action((action ? (action + '.') : '') + 'migrate', oldData))),
        doc
      ]);
      // 需要更新
      if (doc.isModified()) {
        debug('data update...', doc._id);
        await doc.save();
      }
      doc = await cur.next();
    }
  }
}
