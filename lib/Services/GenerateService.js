const {
  BaseService
} = require('./BaseService');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const {
  LevelService
} = require('./LevelService');
const debug = require('debug')('saas-plat:GenerateService');

// 生单/转换服务
exports.GenerateService = class GenerateService extends BaseService {
  constructor(from, ...args) {
    super(...args);
    this.fromEntity = from;
    this.fromService = new LevelService(this.fromEntity, this.context, this.findRepository, this.options);
  }

  // 生单
  async generate(fromid, deleteOld = false) {
    const fromEntity = await this.fromService.repository.get(fromid);
    if (fromEntity.status !== 'effective') {
      throw new BizError(t('来源单据无效，无法生单或转换'));
    }
    const toEntity = await this.repository.create();
    if (typeof toEntity.generate !== 'function') {
      await this.repository.rollback(toEntity);
      throw new BizError(t('目标单不支持生单或转换操作'));
    }
    const params = fromEntity.toJS();
    // 需要把ID删除不要导致id修改报错
    const idKey = fromEntity.constructor.mappings.id || 'id';
    delete params[idKey];
    await toEntity.generate({
      ...params,
      srcId: fromEntity.id,
      ts: toEntity.ts
    });
    this.newEntities.push(toEntity);
    if (deleteOld) {
      await this.fromService.delete(fromEntity);
    }
    return toEntity;
  }

}
