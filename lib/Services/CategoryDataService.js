const {
  BaseService
} = require('./BaseService');
const {
  LevelService
} = require('./LevelService');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const debug = require('debug')('saas-plat:CategoryDataService');

// 带分类数据
const CategoryDataService = exports.CategoryDataService = class CategoryDataService extends BaseService {
  constructor(tree, ...args) {
    super(...args);
    this.categoryEntity = tree;
    this.levelService = new LevelService(this.categoryEntity, this.context, this.findRepository);
  }

  async saveCategory(...datas) {
    const results = [];
    for (const data of datas) {
      const entity = await this.levelService.save({
        ...data
      });
      results.push(entity);
    }
    return datas.length === 1 ? results[0] : results;
  }

  async deleteCategory(...ids) {
    await this.levelService.save(...ids);
  }

  async saveData(...datas) {
    const distincts = datas.reduce((cids, it) => {
      const categoryId = it.category.id;
      if (categoryId && cids.indexOf(categoryId) === -1) {
        cids.push(categoryId);
      }
      return cids;
    }, []);
    for (const categoryId of distincts) {
      const ds = datas.filter(it => it.category.id === categoryId);
      const details = await this.save(...ds);
      // 这里的dtails是增加的意思，但是save只能更新，需要获取已经存在的details
      const category = await this.levelService.repository.get(categoryId);
      if (!category) {
        throw new BizError(t('数据所属分类({{categoryId}})未找到!', {
          categoryId
        }))
      }
      const exists = category.details.map(id => id);
      await this.levelService.save({
        id: categoryId,
        details: exists.concat(details.filter(it => exists.indexOf(it.id) === -1).map(id => ({
          id
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
      const category = await this.levelService.repository.get(categoryId);
      await this.levelService.save({
        id: categoryId,
        details: details.filter(it => !details.every(it => it.id === it)).map(it => ({
          id: it
        }))
      });
    }
  }
}
