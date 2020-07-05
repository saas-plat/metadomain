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
exports.GenerateService = class GenerateService {
  constructor(fromService, toService) {
    this.newEntities = [];
    this.fromService = fromService;
    this.toService = toService;
  }

  // 生单
  async generate(fromid, deleteOld = false) {
    const fromEntity = await this.fromService.repository.get(fromid);
    if (fromEntity.status !== 'effective') {
      throw new BizError(t('来源实体无效, 无法生成或转换'));
    }
    const toEntity = await this.toService.repository.create();
    if (typeof toEntity.generate !== 'function') {
      await this.toService.repository.rollback(toEntity);
      throw new BizError(t('目标实体不支持生成或转换操作'));
    }
    const params = fromEntity.toJS();
    // 需要把ID删除不要导致id修改报错
    const idKey = fromEntity.constructor.schema.mappings.id || 'id';
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
