const {BizEntity} = require('./BizEntity');

// 基础数据对象
const BaseData = exports.BaseData = class BaseData extends BizEntity {

}

BaseData.eventTypes = BizEntity.eventTypes.concat();
BaseData.fields = {
  ...BizEntity.fields,

}

// 层级数据，多行数据间有父子关系
const LevelData = exports.CategoryData = class LevelData extends BaseData {

}

LevelData.eventTypes = BaseData.eventTypes.concat();
LevelData.fields = {
  ...BaseData.fields,

}


// 分类数据，为基础数据提供类别定义
const CategoryData = exports.CategoryData = class CategoryData extends BizEntity {

}

CategoryData.eventTypes = BizEntity.eventTypes.concat();
CategoryData.fields = {
  ...BizEntity.fields,

}
