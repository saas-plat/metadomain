const Repository = require('sourced-repo-mongo-hotfix').Repository;
const debug = require('debug')('saas-plat:sourced-repo-mongo-fix');
const _ = require('lodash');
require('eventasync');

Repository.prototype.commit = function commit(entity, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var self = this;

  debug('committing %s for id %s', this.entityType.name, entity.id);

  this._commitEvents(entity, function _afterCommitEvents(err) {
    if (err)
      return cb(err);

    self._commitSnapshots(entity, options, function _afterCommitSnapshots(err) {
      if (err)
        return cb(err);
      Promise.all(self._emitEvents(entity)).catch(err => {
        console.warn(err);
      }).then(() => cb());
    });
  });

};

Repository.prototype.commitAll = function commit(entities, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var self = this;

  debug('committing %s for id %j', this.entityType.name, _.map(entities, 'id'));

  this._commitAllEvents(entities, function _afterCommitEvents(err) {
    if (err)
      return cb(err);
    self._commitAllSnapshots(entities, options, function _afterCommitSnapshots(err) {
      if (err)
        return cb(err);
      let list = [];
      entities.forEach(function(entity) {
        list = list.concat(self._emitEvents(entity));
      });
      //console.log(list.length)
      Promise.all(list).catch(err => {
        console.warn(err);
      }).then(() => {
         cb();
      });
    });
  });

};

Repository.prototype._emitEvents = function _emitEvents(entity) {
  var self = this;

  var eventsToEmit = entity.eventsToEmit;
  entity.eventsToEmit = [];
  const promises = eventsToEmit.map(function(eventToEmit) {
    var args = Array.prototype.slice.call(eventToEmit);
    // 改成支持异步事件
    return self.entityType.prototype.emitAsync.apply(entity, args);
  });

  debug('emitted local events for id %s', entity.id);
  return promises;
};
