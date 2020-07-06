const {
  readonly,
  readonlyDeep
} = require('./util');

const Event = exports.Event = class Event {
  constructor(name, data = {}) {
    // event在action执行时可以修改的不是readonlyDeep
    readonly(this, 'data', data);
    readonly(this, 'name', name);
  }
}

const Action = exports.Action = class Action {
  constructor(name, data = {}, opts) {
    readonlyDeep(this, 'data', data);
    readonly(this, 'name', name);
    if (opts) {
      Object.keys(opts).forEach(key => {
        readonly(this, key, opts[key]);
      })
    }
  }
}

const Command = exports.Command = class Command {
  constructor(name, data = {}) {
    readonlyDeep(this, 'data', data);
    readonly(this, 'name', name);
  }
}
