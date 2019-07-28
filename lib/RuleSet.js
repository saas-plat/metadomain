const i18n = require('./i18n');
const nools = require('nools');
const debug = require('debug')('saas-plat:ruleset');

const RuleSet = exports.RuleSet = class RuleSet {

  constructor(name, noolsSource = [], define, scope) {
    this.name = name || assignId('RuleSet');
    // 这里没找到问题根源，在单元测试反复执行时不触发规则
    if (process.env.NODE_ENV !== 'production') {
      nools.hasFlow(this.name) && nools.deleteFlow(this.name);
    }
    this.flow = nools.getFlow(name) || nools.compile(noolsSource.join('\n'), {
      define,
      scope,
      name: this.name
    });
    rs('create rule flow', this.name);
  }

  async execute(facts, filter) {
    rs('execute flow session');
    const session = this.flow.getSession(...facts);
    await session.match();
    const result = session.getFacts(filter)
    rs('dispose flow session');
    session.dispose();
    return result;
  }

  dispose() {
    rs('dispose rule flow');
    nools.deleteFlow(this.name);
    this.flow = null;
  }
}
