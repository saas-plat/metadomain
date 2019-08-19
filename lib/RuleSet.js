const i18n = require('./i18n');
const nools = require('nools');
const debug = require('debug')('saas-plat:RuleSet');
const {
  BizError
} = require('./Error');

const RuleSet = exports.RuleSet = class RuleSet {

  constructor(name, noolsSource = [], define, scope = {}) {
    this.name = name || assignId('RuleSet');
    // 这里没找到问题根源，在单元测试反复执行时不触发规则
    if (process.env.NODE_ENV !== 'production') {
      nools.hasFlow(this.name) && nools.deleteFlow(this.name);
    }
    if (!noolsSource) {
      noolsSource = [];
    }
    if (!Array.isArray(noolsSource)) {
      noolsSource = [noolsSource];
    }
    //debug(noolsSource.join('\n'))
    this.flow = nools.getFlow(name) || nools.compile(noolsSource.join('\n'), {
      define,
      scope: {
        i18n,
        t: i18n.t,
        BizError,
        ...scope
      },
      name: this.name
    });
    debug('%s rule flow', this.name, noolsSource.length);
  }

  async execute(facts, filter) {
    debug('execute flow session', facts.map(it => it.name || it.$name || it.constructor.name));
    const session = this.flow.getSession(...facts);
    await session.match();
    let result;
    if (filter) {
      result = session.getFacts(filter);
    } else {
      result = session.getFacts();
    }
    debug('dispose flow session');
    session.dispose();
    return result;
  }

  dispose() {
    debug('dispose rule flow');
    nools.deleteFlow(this.name);
    this.flow = null;
  }
}
