const Event = exports.Event = class Event {
  constructor(name, args = {}) {
    this.args = args;
    this.name = name;
  }
}
