const {
  BaseData
} = require('./BaseData');

// 层级数据，多行数据间有父子关系
const LevelData = exports.LevelData = class LevelData extends BaseData {

}

LevelData.actionMethods = [...BaseData.actionMethods];
LevelData.eventTypes = [...BaseData.eventTypes];
LevelData.fields = {
  ...BaseData.fields,
  // parent和childs需要具体类mapping
  parent: 'reference',
  childs: {
    type: 'array',
    subtype: 'reference',
    default: []
  },

  deep: 'number',
  level: 'string'
}
