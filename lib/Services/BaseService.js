const {
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
    if (!this._repository){
      throw new Error(t('主实体仓库无法加载！'))
    }
    return this._repository;
  }

  async _reduceArray(data, paths, index = 0, prePath = '') {
    const path = paths[index];
    const isEnd = paths.length === index + 1;
    const refData = _.get(data, prePath + path);
    if (!isEnd) {
      const arrayData = _.toArray(refData);
      arrayData.forEach((row, i) => {
        await this._reduceArray(data, paths, index + 1, path + '[' + i + ']');
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
      const refEntity = refData.id && await refRepository.get(refData.id);
      if (!refEntity) {
        throw new BizError(t('引用{{ref.name}}实体{{data.id}}不存在', {
          data: refData,
          ref: refRepository.entityType
        }));
      }
      _.set(data, path, refEntity);
    }
  }

  async handleData(data) {
    const references = this.entity.references;
    Object.keys(references).forEach(path => {
      // path 是一个数组情况
      const arrSplits = path.split('[]');
      await this._reduceArray(data, arrSplits);
    })
    return {
      ...this.context,
      ...data
    }
  }

  async save(...items) {
    const commits = [];
    for (const it of items) {
      let entity = await this.repsitory.get(it.id);
      if (!entity) {
        entity = await this.entity.create(it.id);
      }
      const params = await this.handleData(it);
      await entity.save(params);
      commits.push(entity);
    }
    await this.repsitory.commitAll(commits);
  }

  async delete(...ids) {
    const commits = [];
    for (const id of ids) {
      const entity = await this.repsitory.get(id);
      if (!entity) {
        break;
      }
      entity.delete({
        ...this.context
      });
      commits.push(entity);
    }
    await this.repsitory.commitAll(commits);
  }
}
