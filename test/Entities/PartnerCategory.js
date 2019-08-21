const {
  MetaEntity,
  LevelData,
} = require('../../lib');

module.exports = MetaEntity.create(LevelData, 'PartnerCategory', {
  "Code": 'string',
  "Name": 'string',
}, [`rule has_date_cant_be_delete {
  when{
    e: Action e.name == 'delete';
    o: Entity
  }
  then{

  }
}`]);
