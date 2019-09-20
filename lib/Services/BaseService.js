const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  parseBigData,
  parseUserData
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
  constructor(entity, context = {}, findRepository = createRep(entity), options = {}) {
    if (!entity) {
      throw Error(t('实体未知,无法执行服务'))
    }
    this.options = options;
    this.findRepository = findRepository;
    this.context = context;
    this.entityType = entity;
    this.references = [];
    this.newEntities = [];
  }

  get repository() {
    if (!this._repository) {
      //debug(this.entityType)
      this._repository = this.findRepository(this.entityType.name);
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
        debug('not found entity', refData)
        // 查找失败
        entity = null;
      } else {
        // 如果要是一个没有id的实体,可以自动生成一个
        const Service = require('./index')[refRepository.entityType.service];
        if (!Service) {
          throw new Error(t('{{name}}实体{{service}}服务尚未支持！', {
            name: refRepository.entityType.type,
            service: refRepository.entityType.service
          }));
        }
        debug('create entity...')
        const service = new Service(refRepository.entityType, this.context, this.findRepository, this.options);
        entity = await service.save({
          ...refData
        });
        if (this.newEntities.indexOf(entity) === -1) {
          this.newEntities.push(entity);
        }
      }
    }
    return entity;
  }

  async _loadReferences(data, paths, index = 0, prePath = '') {
    const path = prePath + paths[index];
    const isEnd = paths.length === index + 1;
    const refData = _.get(data, path);
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
      const entityName = this.entityType.references[paths.join('[]')];
      const refRepository = await this.findRepository(entityName);
      if (!refRepository) {
        throw new Error(t('引用{{entityName}}实体未定义', {
          entityName
        }));
      }
      const refEntity = await this._handleReference(refData, refRepository);
      if (!refEntity) {
        throw new Error(t('引用{{ref}}实体({{data.id}})不存在', {
          data: refData,
          ref: entityName
        }));
      }
      if (this.references.indexOf(refEntity) === -1) {
        this.references.push(refEntity);
      }
      _.set(data, path, refEntity);
    }
  }

  async _loadData(data, entityType = this.entityType) {
    const bdata = parseBigData(data, entityType.mappings);
    const references = entityType.references;
    // debug('load references', references)
    for (const path of Object.keys(references)) {
      // path 是一个数组情况
      const arrSplits = path.split('[]');
      await this._loadReferences(bdata, arrSplits);
    }
    //debug('load mappings', entityType.mappings, bdata)
    const udata = parseUserData(bdata, entityType.mappings);
    return udata;
  }

  async save(...datas) {
    const results = [];
    for (const data of datas) {
      if (typeof data !== 'object') {
        throw new Error(t('data参数格式错误,必须是object类型'))
      }
      // 解析大数组
      const {
        id,
        ...params
      } = await this._loadData(data);
      let entity = id ? await this.repository.get(id) : null;
      if (!entity) {
        //  debug(params)
        entity = await this.entityType.create({
          createBy: this.context.user.id,
          ...params
        });
        this._beforeSave && await this._beforeSave(entity, true);
        await this.repository.commit(entity);
        this._afterSave && await this._afterSave(entity);
      } else {
        this._beforeSave && await this._beforeSave(entity);
        await entity.save({
          updateBy: this.context.user.id,
          ...params
        });
        if (entity.updateBy === null) {
          throw 1
        }
        this._afterSave && await this._afterSave(entity);
      }
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
      const params = await this._loadData(data);
      let entity = await this.repository.get(params.id);
      if (!entity) {
        entity = await this.repository.create({
          id: params.id
        });
      }
      await entity.customAction(action, {
        updateBy: this.context.user.id,
        ...params
      });
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
      const {
        id,
        ...params
      } = await this._loadData(data);
      const entity = await this.repository.get(id);
      if (!entity) {
        throw new Error(t('数据不存在,无法修改状态', {
          entityName: this.entityType.constructor.name
        }));
      }
      await entity.saveStatus({
        updateBy: this.context.user.id,
        ...params,
      });
      //await this.repository.commit(entity);
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
      //debug(entity)
      //await this.repository.commit(entity);
      results.push(entity);
    }
    //  await this.repository.commitAll(commits);
    return ids.length === 1 ? results[0] : results;
  }

  async saveAttachment(){

  }

  async deleteAttachment(){

  }
}
