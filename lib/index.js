module.exports = {
  db: require('./db'),
  ...require('./Error'),
  ...require('./Event'),
  ...require('./MetaEntity'),
  ...require('./Migration'),
  ...require('./Repository'),
  ...require('./Entities'),
  ...require('./Services'),
  Entities: require('./Entities'),
  Services: require('./Services'),
}

require('./MetaEntity').register(require('./Entities'));
