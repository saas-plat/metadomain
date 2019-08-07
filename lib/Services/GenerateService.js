const {
  BaseService
} = require('./BaseService');

// 生单/转换服务
exports.GenerateServiceService = class GenerateServiceService extends BaseService {
  constructor(from, to, context, findRepsitory) {
    super(to, context, findRepsitory);
    this.fromEntity = from;
    this.fromService = new LevelService(this.fromEntity, this.context, this.findRepsitory);
  }

  // 生单
  async generate(id, deleteOld = false) {
    const toEntity = await this.entity.create();
    const fromEntity = await this.fromService.repository.get(id);
    await toEntity.generate(fromEntity);
    await this.repository.commit(toEntity);
    if (deleteOld) {
      await this.fromService.delete(fromEntity);
    }
    return toEntity;
  }

}
