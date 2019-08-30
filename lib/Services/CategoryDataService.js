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
    this.levelService = new LevelService(this.categoryEntityType, this.context, this.findRepository, this.options);
    this._oldDatas = [];
  }

  // 检查分类是否有明细
  async _checkHasDetails(...items) {
    // 有明细也可以删除选项
    if (items.length <= 0 || this.options.deleteHasDetails) {
      return;
    }
    for (const it of items) {
      if (it.details.length > 0) {
        return it;
      }
    }
    const ids = Array.from(new Set(items.reduce((arr, it) => arr.concat(it.childs.map(it => it.id)), [])));
    if (ids.length > 0) {
      const childs = await this.levelService.repository.getAll(...ids);
      return await this._checkHasDetails(...childs);
    }
  }

  // 检查不是末级的分类
  async _checkHasChilds(...items) {
    if (this.options.addHasDetails) {
      return;
    }
    for (const it of items) {
      if (!it) {
        continue;
      }
      const category = await this.levelService.repository.get(it.id);
      if (category.childs.length > 0) {
        return category;
      }
    }
    return null;
  }

  async saveCategory(...datas) {
    const results = [];
    for (const data of datas) { 
      const entity = await this.levelService.save(data);
      results.push(entity);
    }
    // 有明细必须是末级
    const detailCategories = results.filter(it => it.details.length > 0);
    const notEndCategory = await this._checkHasChilds(...detailCategories);
    if (notEndCategory) {
      throw new BizError(t('有明细的分类{{name}}不能移动到非末级!', notEmptyCategory));
    }
    return datas.length === 1 ? results[0] : results;
  }

  async deleteCategory(...ids) {
    const results = [].concat(await this.levelService.delete(...ids));
    debug('delete category ...', ids)
    const notEmptyCategory = await this._checkHasDetails(...results);
    if (notEmptyCategory) {
      await this.levelService.repository.rollback(...results);
      throw new BizError(t('有明细的分类{{name}}不能直接删除!', notEmptyCategory));
    }
    return ids.length === 1 ? results[0] : results;
  }

  async _beforeSave(entity, addnew = false) {
    if (addnew) {
      return;
    }
    // 记录之前的实体分类信息，用于删除所属分类
    this._oldDatas.push({
      id: entity.id,
      categoryId: entity.category.id
    });
  }

  async saveData(...datas) {
    this._oldDatas.length = 0;
    // loaddata也没法获取mapping名称category所以添加后获取category
    const details = [].concat((await this.save(...datas)));
    // 不是末级分类不能添加明细
    const notEndParent = await this._checkHasChilds(...details.map(it => it.category));
    if (notEndParent) {
      await this.repository.rollback(...details);
      throw new BizError(t('{{name}}不是末级分类不能添加明细!', notEndParent));
    }
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
        // 新增
        addEntities.push(it);
        if (distincts.indexOf(categoryId) === -1) {
          distincts.push(categoryId);
        }
      } else if (oldEntityData.categoryId !== categoryId) {
        // 修改
        addEntities.push(it);
        removeDatas.push(oldEntityData);
        if (distincts.indexOf(categoryId) === -1) {
          distincts.push(categoryId);
        }
      }
    });
    const updatesCategories = [];
    // 每个分只执行一个save，包括删除和新增的
    for (const categoryId of distincts) {
      // 删除
      const removeDetails = removeDatas.filter(it => it.category.id === categoryId);
      // 新增
      const addDetails = addEntities.filter(it => it.category.id === categoryId);
      // 这里的dtails是增加的意思，但是save只能更新，需要获取已经存在的details
      const category = await this.levelService.repository.get(categoryId);
      if (!category) {
        // 这里detail不需要删除，但是需要rollback，要不其他会读出脏数据
        await this.levelService.repository.rollback(...updatesCategories);
        await this.repository.rollback(...details);
        throw new BizError(t('所属分类({{categoryId}})未找到!', {
          categoryId
        }));
      }
      const details = category.details.filter(it => removeDatas.every(dit => dit.id !== it.id)).concat(addDetails);
      debug('save category(%s) details... -%s +%s', categoryId, removeDatas.length, addDetails.length);
      updatesCategories.concat(await this.levelService.save({
        ts: category.ts,
        id: category.id,
        details
      }));
    }
    return datas.length === 1 ? details[0] : details;
  }

  async deleteData(...ids) {
    const deletes = [].concat(await this.delete(...ids));
    const distincts = deletes.reduce((cids, it) => {
      if (cids.indexOf(it.category.id) === -1) {
        cids.push(it.category.id);
      }
      return cids;
    }, []);
    // 这里的dtails是减少的意思
    for (const categoryId of distincts) {
      const category = await this.levelService.repository.get(categoryId);
      if (!category) {
        throw new BizError(t('所属分类({{categoryId}})未找到!', {
          categoryId
        }));
      }
      debug('update category...');
      await this.levelService.save({
        id: categoryId,
        ts: category.ts,
        details: category.details.filter(it => deletes.every(dit => dit.id !== it.id)).map(it => ({
          id: it.id
        }))
      });
    }
    return ids.length === 1 ? deletes[0] : deletes;
  }
}
