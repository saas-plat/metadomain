const i18n = require('./i18n');
const nools = require('nools');
const {
  modifiers
} = require('nools/lib/compile/common');
const extd = require("nools/lib/extended"),
  forEach = extd.forEach;
const debug = require('debug')('saas-plat:RuleSet');
const {
  BizError
} = require('./Error');

// 解析参见 node_modules/nools/lib/compile
const parseRule = (items, define, identifiers) => {
  if (!items) {
    return;
  }
  items.forEach(arr => {
    const r0 = arr[0];
    if (r0 === 'not' || r0 === 'exists') {
      arr[1] = define[r0];
      identifiers.push(arr[2]);
    } else if (r0 === 'or') {
      parseRule(it.slice(1), define, vars);
    } else {
      arr[0] = define[r0];
      identifiers.push(arr[1]);
    }
  });
}

const parseAction = (action, identifiers, defined, scope) => {
  var declares = [];
  forEach(identifiers, function (i) {
    if (action.indexOf(i) !== -1) {
      declares.push("var " + i + "= facts." + i + ";");
    }
  });
  extd(defined).keys().forEach(function (i) {
    if (action.indexOf(i) !== -1) {
      declares.push("var " + i + "= defined." + i + ";");
    }
  });

  extd(scope).keys().forEach(function (i) {
    if (action.indexOf(i) !== -1) {
      declares.push("var " + i + "= scope." + i + ";");
    }
  });
  extd(modifiers).forEach(function (i) {
    if (action.indexOf(i) !== -1) {
      declares.push("if(!" + i + "){ var " + i + "= flow." + i + ";}");
    }
  });
  var params = ["facts", 'flow'];
  if (/next\(.*\)/.test(action)) {
    params.push("next");
  }
  action = declares.join("") + action;
  try {
    return new Function("defined, scope", "return " + new Function(params.join(","), action).toString())(defined, scope);
  } catch (e) {
    throw new Error("Invalid action : " + action + "\n" + e.message);
  }
};

const RuleSet = exports.RuleSet = class RuleSet {

  constructor(name, noolsSource = [], define, scope = {}) {
    this.name = name || assignId('RuleSet');
    // 这里没找到问题根源，在单元测试反复执行时不触发规则
    if (process.env.NODE_ENV !== 'production') {
      nools.hasFlow(this.name) && nools.deleteFlow(this.name);
    }
    //  debug('%s ruleset...', name)
    if (!noolsSource) {
      noolsSource = [];
    }
    if (!Array.isArray(noolsSource)) {
      noolsSource = [noolsSource];
    }
    //debug(noolsSource.join('\n'))
    const isDsl = noolsSource.every(src => typeof src === 'string');
    try {
      const ruleScope = {
        i18n,
        // t: i18n.t,  // t一个字符容易和用户定义的变量冲突
        // BizError,
        ...scope
      };
      this.flow = nools.getFlow(name) || isDsl ? nools.compile(noolsSource.join('\n'), {
        define,
        scope: ruleScope,
        name: this.name
      }) : nools.flow(name, (flow) => {
        for (let {
            name,
            when,
            then
          } of noolsSource) {
          if (!Array.isArray(when)) {
            when = [when];
          }
          if (!Array.isArray(then)) {
            then = [then];
          }
          //  提取when中的别名
          const identifiers = [];
          // when转换类型定义成define中的类型
          const alldefines = {
            Array: Array,
            String: String,
            Number: Number,
            Boolean: Boolean,
            RegExp: RegExp,
            Date: Date,
            Object: Object,
            ...define
          }
          parseRule(when, alldefines, identifiers);
          // debug('when:%o', when);
          // debug('identifiers:%o', identifiers);
          // 结构别名的变量
          flow.rule(name, {
            scope: ruleScope
          }, when, parseAction(then.join('\n'), identifiers, alldefines, ruleScope));
        }
      });
    } catch (err) {
      throw new BizError(i18n.t('规则语法错误，{{message}}', {
        message: err.message
      }));
    }
    debug('%s load %s rules', this.name, noolsSource.length);
  }

  async execute(facts, filter) {
    debug('execute %s session...%o', this.name, facts.map(it => it.name || `#${it.constructor.name}#` || '#Object#'));
    const session = this.flow.getSession(...facts);
    let result;
    try {
      await session.match();
      if (filter) {
        result = session.getFacts(filter);
      } else {
        result = session.getFacts();
      }
    } catch (err) {
      throw err;
    } finally {
      //debug('dispose %s session', this.name);
      session.dispose();
    }
    return result;
  }

  dispose() {
    debug('dispose %s flow', this.name);
    nools.deleteFlow(this.name);
    this.flow = null;
  }
}
