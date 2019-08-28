const {
  BaseService
} = require('./BaseService');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');
const debug = require('debug')('saas-plat:GenerateServiceService');

// 生单/转换服务
exports.GenerateServiceService = class GenerateServiceService extends BaseService {
  constructor(from, ...args) {
    super(...args);
    this.fromEntity = from;
    this.fromService = new LevelService(this.fromEntity, this.context, this.findRepository, this.options);
  }

  // 生单
  async generate(id, deleteOld = false) {
    const fromEntity = await this.fromService.repository.get(id);
    if (fromEntity.status !== 'effective') {
      throw new BizError(t('来源单据无效，无法生单或转换'));
    }
    const toEntity = await this.repository.create();
    if (typeof toEntity.generate !== 'function') {
      await this.repository.rollback(toEntity);
      throw new BizError(t('目标单不支持生单或转换操作'));
    }
    await toEntity.generate(fromEntity);
    if (deleteOld) {
      await this.fromService.delete(fromEntity);
    }
    return toEntity;
  }

}
