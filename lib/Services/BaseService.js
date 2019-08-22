const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  parseData
} = require('../util');
const _ = require('lodash');
const debug = require('debug')('saas-plat:BaseService');

const createRep = (entity) => {
  const reps = {
    [entity.name]: Repository.create(entity)
  }
  return key => reps[key];
}

const BaseService = exports.BaseService = class BaseService {
  constructor(entity, context = {}, findRepository = createRep(entity), mapping = {}) {
    if (!entity) {
      throw Error(t('实体未知，无法执行服务'))
    }
    this.findRepository = findRepository;
    this.context = context;
    this.entity = entity;
    this.references = [];
    this.newEntities = [];
    this.mapping = {
      ...this.constructor.mapping,
      ...(mapping || {})
    };
  }

  get repository() {
    if (!this._repository) {
      //debug(this.entity)
      this._repository = this.findRepository(this.entity.name);
    }
    if (!this._repository) {
      throw new Error(t('主实体仓库无法加载！'))
    }
    return this._repository;
  }

  async _handleReference(refData, refRepository) {
    let entity = refData && refData.id ? await refRepository.get(refData.id) : null;
    if (!entity && refData) {
      if (refData.id) {
        // 查找失败
        entity = null;
      } else {
        // 如果要是一个没有id的实体，可以自动生成一个
        const Service = require('./index')[refRepository.entityType.name.replace('Data', 'Service')];
        if (!Service) {
          throw new Error(t('{{name}}实体服务查找失败！', refRepository.entityType));
        }
        const service = new Service(refRepository.entityType, this.context, this.findRepository, this.mapping);
        entity = await service.save({
          ...data,
          ...refData,
          srcId: mainEntity.id
        });
        this.newEntities.push(entity);
      }
    }
    return entity;
  }

  async _loadReferences(data, paths, index = 0, prePath = '') {
    const path = paths[index];
    const isEnd = paths.length === index + 1;
    const refData = _.get(data, prePath + path);
    if (!isEnd) {
      const arrayData = _.toArray(refData);
      for (let i = 0; i < arrayData.length; i++) {
        const row = arrayData[i];
        await this._loadReferences(data, paths, index + 1, path + '[' + i + ']');
      }
      return;
    }
    if (refData) {
      // 加载引用实体仓库
      const entityName = this.entity.references[path];
      const refRepository = await this.findRepository(entityName);
      if (!refRepository) {
        throw new Error(t('引用{{entityName}}实体未定义', {
          entityName
        }));
      }
      const refEntity = await this._handleReference(refData, refRepository, data);
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

  async _loadData(data) {
    const references = this.entity.references;
    for (const path of Object.keys(references)) {
      // path 是一个数组情况
      const arrSplits = path.split('[]');
      await this._loadReferences(data, arrSplits);
    }
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
      const params = await this._loadData(formatData);
      let entity = await this.repository.get(params.id);
      if (!entity) {
        entity = await this.entity.create({
          createBy: this.context.user.id,
          ...params
        });
      } else {
        await entity.save({
          updateBy: this.context.user.id,
          ...params
        });
      }
      await this.repository.commit(entity);
      results.push(entity);
    }
    // 不要commitAll由调用服务者提供统一的提交
    // await this.repository.commitAll();
    return datas.length === 1 ? results[0] : results;
  }

  async customAction(action, ...datas) {
    const results = [];
    for (const data of datas) {
      // 解析大数组
      const formatData = parseData(data);
      let entity = await this.repository.get(formatData.id);
      if (!entity) {
        entity = await this.entity.create(formatData.id);
      }
      const params = await this._loadData(formatData);
      await entity.customAction(action, {
        updateBy: this.context.user.id,
        ...params
      });
      await this.repository.commit(entity);
      results.push(entity);
    }
    // 不要commitAll由调用服务者提供统一的提交
    // await this.repository.commitAll();
    return datas.length === 1 ? results[0] : results;
  }

  async saveStatus(...datas) {
    const results = [];
    for (const data of datas) {
      // 解析大数组
      const formatData = parseData(data);
      const entity = await this.repository.get(formatData.id);
      if (!entity) {
        throw new Error(t('数据不存在，无法修改状态', {
          entityName: this.entity.constructor.name
        }));
      }
      const params = await this._loadData(formatData);
      await entity.saveStatus({
        updateBy: this.context.user.id,
        ...params,
      });
      await this.repository.commit(entity);
      results.push(entity);
    }
    return datas.length === 1 ? results[0] : results;
  }

  // 拷贝
  async copy(id) {

  }

  async delete(...ids) {
    const results = [];
    for (const id of ids) {
      const entity = await this.repository.get(id);
      if (!entity) {
        break;
      }
      await entity.delete({
        deleteBy: this.context.user.id,
        ts: entity.ts
      });
      await this.repository.commit(entity);
      results.push(entity);
    }
    //  await this.repository.commitAll(commits);
    return ids.length === 1 ? results[0] : results;
  }
}

BaseService.mapping = {};
