const {
  readonly,
  readonlyDeep
} = require('./util');
const _ = require('lodash');

const Event = exports.Event = class Event {
  constructor(data = {}) {
    _.merge(this, data);
  }
}

const Action = exports.Action = class Action {
  constructor(name, data = {}) {
    readonly(this, 'data', data);
    readonly(this, 'name', name);
  }
}

const Command = exports.Command = class Command {
  constructor(name, data = {}) {
    readonly(this, 'data', data);
    readonly(this, 'name', name);
  }
}

const MigrationAction = exports.MigrationAction = class MigrationAction {
  constructor(name, data) {
    readonly(this, 'name', name + (name ? '.' : '') + 'migrate');
    readonly(this, 'event', data.method);
    readonly(this, 'id', data.id); 
    readonlyDeep(this, 'data', data.data);
  }
}
