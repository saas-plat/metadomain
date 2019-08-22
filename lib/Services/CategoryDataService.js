const {
  BaseService
} = require('./BaseService');
const {
  LevelService
} = require('./LevelService');
// 带分类数据
exports.CategoryDataService = class CategoryDataService extends BaseService {
  constructor(tree, ...args) {
    super(...args);
    this.categoryEntity = tree;
    this.categoryService = new LevelService(this.categoryEntity, this.context, this.findRepository);
  }

  async saveCategory(...datas) {
    const results = [];
    for (const data of datas) {
      const entity = await this.categoryService.save({
        ...data
      });
      results.push(entity);
    }
    return datas.length === 1 ? results[0] : results;
  }

  async deleteCategory(...ids) {
    await this.categoryService.save(...ids);
  }

  async saveData(...datas) {
    const distincts = datas.reduce((cids, it) => {
      if (cids.indexOf(it.categoryId) === -1) {
        cids.push(it.categoryId);
      }
      return cids;
    }, []);
    for (const categoryId of distincts) {
      const ds = datas.filter(it => it.categoryId === categoryId);
      const details = await this.save(...ds);
      // 这里的dtails是增加的意思，但是save只能更新，需要获取已经存在的details
      const category = await this.categoryService.repository.get(categoryId);
      await this.categoryService.save({
        id: categoryId,
        details: category.details.map(id => ({
          id
        })).concat(details.map(it => ({
          id: it.id
        })))
      });
    }
  }

  async deleteData(...ids) {
    const details = await this.delete(...ids);
    const distincts = details.reduce((cids, it) => {
      if (cids.indexOf(it.categoryId) === -1) {
        cids.push(it.categoryId);
      }
      return cids;
    }, []);
    // 这里的dtails是减少的意思
    for (const categoryId of distincts) {
      const category = await this.categoryService.repository.get(categoryId);
      await this.categoryService.save({
        id: categoryId,
        details: details.filter(it => !details.every(it => it.id === it)).map(it => ({
          id: it
        }))
      });
    }
  }
}
