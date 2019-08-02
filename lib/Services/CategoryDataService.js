const {BaseService} = require('./BaseService');

// 带分类数据
exports.CategoryDataService = class CategoryDataService extends BaseService {
  constructor(categoryRepository, dataRepository, context) {
    super(dataRepository, context);
    this.categoryRepository = categoryRepository;
  }
}
