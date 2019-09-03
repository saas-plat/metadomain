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
    const ruleset = new RuleSet('up_' + tableTypes.map(it => it.schema.name).join('_'), rules, {
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
    const scopes = Array.from(new Set([model.schema.basetype, model.schema.type, model.schema.name, model.schema.basename, '']));
    const batchSize = 10;
    //const collection = conn.collection(model.name);
    const cur = model.find({}, null, {
      batchSize
    }).cursor();
    // 迁移事件
    let doc = await cur.next();
    while (doc) {
      // 执行升级
      debug('execute data %s migration rules...', doc._id);
      const oldData = doc.toObject(); //await collection.findOne({
      //   _id: new mongoose.mongo.ObjectID(doc._id)
      // });
      doc.set(oldData)
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
