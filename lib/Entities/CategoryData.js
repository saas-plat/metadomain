const {BizEntity} = require('./BizEntity');



// 分类数据，为基础数据提供类别定义
const CategoryData = exports.CategoryData = class CategoryData extends BizEntity {

}

CategoryData.eventTypes = BizEntity.eventTypes.concat();
CategoryData.fields = {
  ...BizEntity.fields,
  pid: 'string',
  data: ['string']
}
