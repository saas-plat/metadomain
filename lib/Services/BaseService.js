dataconst {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  parseData
} = require('./util');

exports.BaseService = class BaseService {
  constructor(entity, context, findRepsitory) {
    this.findRepsitory = findRepsitory;
    this.context = context;
    this.entity = entity;
    this.references = [];
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
        throw new Error(t('引用{{entityName}}实体未定义', {
          entityName
        }));
      }
      const refEntity = await this._handleReference(refData, refRepository, data, mainEntity);
      if (!refEntity) {
        throw new Error(t('引用{{ref.name}}实体{{data.id}}不存在', {
          data: refData,
          ref: refRepository.entityType
        }));
      }
      this.references.push(refEntity);
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
      // 解析大数组
      const formatData = parseData(data);
      let entity = await this.repsitory.get(formatData.id);
      if (!entity) {
        entity = await this.entity.create(formatData.id);
      }
      const params = await this._handleData(formatData, entity);
      await entity.save({
        createBy: this.context.user.id,
        updateBy: this.context.user.id,
        ...params
      });
      await this.repsitory.commit(entity);
      results.push(entity);
    }
    // 不要commitAll由调用服务者提供统一的提交
    // await this.repsitory.commitAll();
    return datas.length === 1 ? results[0] : results;
  }

  async customAction(action, ...datas) {
    const results = [];
    for (const data of datas) {
      // 解析大数组
      const formatData = parseData(data);
      let entity = await this.repsitory.get(formatData.id);
      if (!entity) {
        entity = await this.entity.create(formatData.id);
      }
      const params = await this._handleData(formatData, entity);
      await entity.customAction(action, {
        createBy: this.context.user.id,
        updateBy: this.context.user.id,
        ...params
      });
      await this.repsitory.commit(entity);
      results.push(entity);
    }
    // 不要commitAll由调用服务者提供统一的提交
    // await this.repsitory.commitAll();
    return datas.length === 1 ? results[0] : results;
  }

  async setStatus(...datas) {
    const results = [];
    for (const data of datas) {
      // 解析大数组
      const formatData = parseData(data);
      const entity = await this.repsitory.get(formatData.id);
      if (!entity) {
        throw new Error(t('数据不存在，无法修改状态', {
          entityName: this.entity.constructor.name
        }));
      }
      await entity.setStatus({
        updateBy: this.context.user.id,
        ...formatData,
      });
      await this.repsitory.commit(entity);
      results.push(entity);
    }
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
        updateBy: this.context.user.id,
      });
      results.push(entity);
    }
    //  await this.repsitory.commitAll(commits);
    return ids.length === 1 ? results[0] : results;
  }
}
