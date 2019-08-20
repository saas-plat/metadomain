const {
  BaseService
} = require('./BaseService');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');

// 生单/转换服务
exports.GenerateServiceService = class GenerateServiceService extends BaseService {
  constructor(from, to, context, findRepository) {
    super(to, context, findRepository);
    this.fromEntity = from;
    this.fromService = new LevelService(this.fromEntity, this.context, this.findRepository);
  }

  // 生单
  async generate(id, deleteOld = false) {
    const toEntity = await this.entity.create();
    const fromEntity = await this.fromService.repository.get(id);
    if (fromEntity.status !== 'effective') {
      throw new BizError(t('来源单据无效，无法生单或转换'));
    }
    if (typeof toEntity.generate !== 'function') {
      throw new BizError(t('目标单不支持生单或转换操作'));
    }
    await toEntity.generate(fromEntity);
    await this.repository.commit(toEntity);
    if (deleteOld) {
      await this.fromService.delete(fromEntity);
    }
    return toEntity;
  }

}
