dataconst {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');

exports.BaseService = class BaseService {
  constructor(entity, context, findRepsitory) {
    this.findRepsitory = findRepsitory;
    this.context = context;
    this.entity = entity;
  }

  get repository() {
    if (!this._repository) {
      this._repository = this.findRepsitory(this.entity.name);
    }
    if (!this._repository) {
      throw new Error(t('主实体仓库无法加载！'))
    }
    return this._repository;
  }

  async _handleReference(refData, refRepository) {
    return refData.id && await refRepository.get(refData.id);
  }

  async _reduceArray(mainEntity, data, paths, index = 0, prePath = '') {
    const path = paths[index];
    const isEnd = paths.length === index + 1;
    const refData = _.get(data, prePath + path);
    if (!isEnd) {
      const arrayData = _.toArray(refData);
      arrayData.forEach((row, i) => {
        await this._reduceArray(mainEntity, data, paths, index + 1, path + '[' + i + ']');
      });
      return;
    }
    if (refData) {
      // 加载引用实体仓库
      const entityName = references[path];
      const refRepository = await this.findRepsitory(entityName);
      if (!refRepository) {
        throw new BizError(t('引用{{entityName}}实体未定义', {
          entityName
        }));
      }
      const refEntity = await this._handleReference(refData, refRepository, data, mainEntity);
      if (!refEntity) {
        throw new BizError(t('引用{{ref.name}}实体{{data.id}}不存在', {
          data: refData,
          ref: refRepository.entityType
        }));
      }
      _.set(data, path, refEntity);
    }
  }

  async _handleData(data, mainEntity) {
    const references = this.entity.references;
    Object.keys(references).forEach(path => {
      // path 是一个数组情况
      const arrSplits = path.split('[]');
      await this._reduceArray(mainEntity, data, arrSplits);
    })
    return {
      ...this.context,
      ...data
    }
  }

  async save(...datas) {
    const results = [];
    for (const data of datas) {
      let entity = await this.repsitory.get(data.id);
      if (!entity) {
        entity = await this.entity.create(data.id);
      }
      const params = await this._handleData(data, entity);
      await entity.save(params);
      this.repsitory.commit(entity);
      results.push(entity);
    }
    // 不要commitAll由调用服务者提供统一的提交
    // await this.repsitory.commitAll();
    return datas.length === 1 ? results[0] : results;
  }

  async delete(...ids) {
    const results = [];
    for (const id of ids) {
      const entity = await this.repsitory.get(id);
      if (!entity) {
        break;
      }
      entity.delete({
        ...this.context
      });
      results.push(entity);
    }
    //  await this.repsitory.commitAll(commits);
    return ids.length === 1 ? results[0] : results;
  }
}
