const {
  LevelData
} = require('./LevelData');
const {
  BaseData
} = require('./BaseData');
const debug = require('debug')('saas-plat:CategoryData');

// 分类数据，为基础数据提供类别定义
const CategoryTree = exports.CategoryTree = class CategoryTree extends LevelData {

}
CategoryTree.actionMethods = [...LevelData.actionMethods];
CategoryTree.eventTypes = [...LevelData.eventTypes];
 

const CategoryData = exports.CategoryData = class CategoryData extends BaseData {

}
CategoryData.actionMethods = [...BaseData.actionMethods];
CategoryData.eventTypes = [...LevelData.eventTypes];
