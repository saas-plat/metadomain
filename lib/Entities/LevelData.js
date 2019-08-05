const {BaseData} = require('./BaseData');



// 层级数据，多行数据间有父子关系
const LevelData = exports.CategoryData = class LevelData extends BaseData {

}

LevelData.eventTypes = BaseData.eventTypes.concat();
LevelData.fields = {
  ...BaseData.fields,
  pid: 'string',
  deep: 'number',
}
