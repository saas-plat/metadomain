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
  async generate(id) {
    const toEntity = await this.entity.create();
    const fromEntity = await this.fromService.get(id);
    await toEntity.generate(fromEntity);
  }

}
