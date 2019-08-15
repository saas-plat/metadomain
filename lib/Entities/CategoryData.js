const {
  LevelData
} = require('./LevelData');
const {
  BaseData
} = require('./BaseData');

// 分类数据，为基础数据提供类别定义
const CategoryTree = exports.CategoryData = class CategoryData extends LevelData {

}
CategoryTree.actionMethods = [...LevelData.actionMethods];
CategoryTree.eventTypes = [...LevelData.eventTypes];
CategoryTree.fields = {
  ...LevelData.fields,
  // 引用的明细数据
  details: ['string']
}

const CategoryData = exports.CategoryData = class CategoryData extends BaseData {

}
CategoryData.actionMethods = [...BaseData.actionMethods];
CategoryData.eventTypes = [...LevelData.eventTypes];
CategoryData.fields = {
  ...BaseData.fields,
  // 所属分类
  categoryId: ['string']
}
