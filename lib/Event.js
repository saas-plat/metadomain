const Event = exports.Event = class Event {
  constructor(name, data = {}) {
    this.data = data;
    this.name = name;
  }
}

const Action = exports.Action = class Action {
  constructor(name, data = {}) {
    this.data = data;
    this.name = name;
  }
}


const Command = exports.Command = class Command {
  constructor(name, data = {}) {
    this.data = data;
    this.name = name;
  }
}
