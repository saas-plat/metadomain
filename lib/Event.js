const Event = exports.Event = class Event {
  constructor(name, args = {}) {
    this.args = args;
    this.name = name;
  }
}

const Action = exports.Action = class Action {
  constructor(name, args = {}) {
    this.args = args;
    this.name = name;
  }
}


const Command = exports.Command = class Command {
  constructor(name, args = {}) {
    this.args = args;
    this.name = name;
  }
}
