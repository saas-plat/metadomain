const {BaseService} = require('./BaseService');

// 带分类数据
exports.CategoryDataService = class CategoryDataService extends BaseService {
  constructor(category , data , context, findRepsitory) {
    super(data, context, findRepsitory);
    this.category = category;
  }

  get repository() {
    if (!this._categoryRepository) {
      this._categoryRepository = this.findRepsitory(this.category.name);
    }
    if (!this._categoryRepository){
      throw new Error(t('分类实体仓库无法加载！'))
    }
    return this._categoryRepository;
  }
}
