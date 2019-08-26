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
    this.categoryEntityType = tree;
    this.levelService = new LevelService(this.categoryEntityType, this.context, this.findRepository);
    this._oldDatas = [];
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

  async _beforeSave(entity) {
    // 记录之前的实体分类信息，用于删除所属分类
    this._oldDatas.push({
      id: entity.id,
      categoryId: entity.category.id
    });
  }

  async saveData(...datas) {
    // loaddata也没法获取mapping名称category所以添加后获取category
    const details = await this.save(...datas);
    // 这里能获取新的分类id，但是修改的也需要获取删除
    const distincts = [];
    const removeDatas = [];
    const addEntities = [];
    this._oldDatas.forEach(it => {
      if (distincts.indexOf(it.categoryId) === -1) {
        distincts.push(it.categoryId);
      }
    })
    details.forEach(it => {
      const categoryId = it.category.id;
      const oldEntityData = this._oldDatas.find(oit => oit.id === it.id);
      if (!oldEntityData) {
        addEntities.push(it);
        if (distincts.indexOf(categoryId) === -1) {
          distincts.push(categoryId);
        }
      } else if (oldEntityData.categoryId !== categoryId) {
        addEntities.push(it);
        removeDatas.push(oldEntityData);
        if (distincts.indexOf(categoryId) === -1) {
          distincts.push(categoryId);
        }
      }
    });
    // 每个分只执行一个save，包括删除和新增的
    for (const categoryId of distincts) {
      // 删除
      const removeDetails = removeDatas.filter(it => it.categoryId === categoryId);
      // 新增
      const addDetails = addEntities.filter(it => it.category.id === categoryId);
      // 这里的dtails是增加的意思，但是save只能更新，需要获取已经存在的details
      const category = await this.levelService.repository.get(categoryId);
      if (!category) {
        // 这里detail不需要删除，还没有commitAll
        //await this.delete(detail.id);
        throw new BizError(t('数据所属分类({{categoryId}})未找到!', {
          categoryId
        }));
      }
      await this.levelService.save({
        id: category.id,
        details: category.details.filter(it => removeDatas.every(dit => dit.id !== it.id)).concat(addDetails)
      });
    }
  }

  async deleteData(...ids) {
    const details = await this.delete(...ids);
    const distincts = details.reduce((cids, it) => {
      if (cids.indexOf(it.category.id) === -1) {
        cids.push(it.category.id);
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
