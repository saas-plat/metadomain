const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');

const env = exports.env = {
  //getRepsitory: ()=>{}
}

const reduceArray = async (data, paths, index = 0, prePath = '') => {
  const path = paths[index];
  const isEnd = paths.length === index + 1;
  const refData = _.get(data, prePath + path);
  if (!isEnd) {
    const arrayData = _.toArray(refData);
    arrayData.forEach((row, i) => {
      await reduceArray(data, paths, index + 1, path + '[' + i + ']');
    });
    return;
  }
  if (refData) {
    // 加载引用实体仓库
    const entityName = references[path];
    if (!env.getRepsitory) {
      throw new BizError(t('{{path}}引用{{entityName}}实体无法加载', {
        path,
        entityName
      }));
    }
    const refRepository = await this.getRepsitory(entityName);
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

exports.BaseService = class BaseService {
  constructor(repository, context) {
    this.repository = repository;
    this.context = context;
  }

  async handleData(data) {
    const references = this.repository.entityType.references;
    Object.keys(references).forEach(path => {
      // path 是一个数组情况
      const arrSplits = path.split('[]');
      await reduceArray(data, arrSplits);
    })
    return {
      ...this.context,
      ...data
    }
  }

  async save(...items) {
    const commits = [];
    for (const it of items) {
      let entity = await this.repository.get(it.id);
      if (!entity) {
        entity = await this.repository.entityType.create(it.id);
      }
      const params = await this.handleData(it);
      await entity.save(params);
      commits.push(entity);
    }
    await this.repository.commitAll(commits);
  }

  async delete(...ids) {
    const commits = [];
    for (const id of ids) {
      const entity = await this.repository.get(id);
      if (!entity) {
        break;
      }
      entity.delete({
        ...this.context
      });
      commits.push(entity);
    }
    await this.repository.commitAll(commits);
  }
}
