const {
  Repository,
  CompositeService,
  GenerateService,
} = require('../lib');
const _ = require('lodash');
const {
  expect
} = require('chai');
const util = require('util');
const {
  cutObj
} = require('./util');

describe('单据', () => {

  const ctx = {
    user: {
      id: 'user001'
    }
  }

  let reps;

  const getRep = name => reps[name];

  const commitAll = async () => {
    const keys = Object.keys(reps);
    for (const name of keys) {
      const rep = getRep(name);
      await rep.commitAll();
    }
  }

  const clear = async () => {
    for (const key of Object.keys(getRep)) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.count() > 0) {
        await events.drop();
        await snapshots.drop();
        console.log('-------clear-------');
      }
    }
  }

  // 档案
  let Partner;
  let Department;
  let Warehouse;
  let ReciveType;
  let Currency;
  let VoucherState;
  let BusinessType;

  // 单据
  let SaleOrder;
  let SaleDelivery;
  let ReceivePayment

  let PartnerRepository;
  let DepartmentRepository;
  let WarehouseRepository;
  let ReciveTypeRepository;
  let CurrencyRepository;
  let VoucherStateRepository;
  let BusinessTypeRepository;
  let SaleOrderRepository;
  let SaleDeliveryRepository;
  let ReceivePaymentRepository;

  before(async () => {
    Warehouse = require('./entities/Warehouse');
    Partner = require('./entities/Partner');
    Department = require('./entities/Department');
    ReciveType = require('./entities/ReciveType');
    Currency = require('./entities/Currency');
    VoucherState = require('./entities/VoucherState');
    BusinessType = require('./entities/BusinessType');

    SaleOrder = require('./entities/SaleOrder');
    SaleDelivery = require('./entities/SaleDelivery');
    ReceivePayment = require('./entities/ReceivePayment');

    PartnerRepository = await Repository.create(Partner),
      DepartmentRepository = await Repository.create(Department),
      WarehouseRepository = await Repository.create(Warehouse),
      ReciveTypeRepository = await Repository.create(ReciveType),
      CurrencyRepository = await Repository.create(Currency),
      VoucherStateRepository = await Repository.create(VoucherState),
      BusinessTypeRepository = await Repository.create(BusinessType),
      SaleOrderRepository = await Repository.create(SaleOrder),
      SaleDeliveryRepository = await Repository.create(SaleDelivery),
      ReceivePaymentRepository = await Repository.create(ReceivePayment),

      reps = {
        Partner: PartnerRepository,
        Department: DepartmentRepository,
        Warehouse: WarehouseRepository,
        ReciveType: ReciveTypeRepository,
        Currency: CurrencyRepository,
        VoucherState: VoucherStateRepository,
        BusinessType: BusinessTypeRepository,
        SaleOrder: SaleOrderRepository,
        SaleDelivery: SaleDeliveryRepository,
        ReceivePayment: ReceivePaymentRepository,
      };

    await clear();
  })

  let order;

  it('创建采购订单，保存同时【生成订金的付款单】 ', async () => {

    const cust = (await PartnerRepository.create({
      "Code": "00000001",
      "Name": "广东JH",
      "priuserdefnvc1": "",
      "PartnerAbbName": "广东JH",
      "priuserdefnvc3": "",
      "priuserdefnvc4": "",
      "priuserdefnvc5": "",
      "priuserdefdecm2": null,
      "priuserdefdecm3": null,
      "priuserdefdecm4": null,
      "priuserdefdecm5": null,
      "priuserdefdecm1": -8614.1,
      "priuserdefnvc2": "",
      "UuNo": null,
      "Representative": "",
      "District": null,
      "SaleCreditDays": null
    }));

    const dept = (await DepartmentRepository.create({
      "Code": "83103",
      "Name": "市场一部"
    }));
    const clerk = (await PartnerRepository.create({
      "Code": "tplusdemo101",
      "Name": "tplusdemo101"
    }));
    const warehouse = (await WarehouseRepository.create({
      "Code": "00",
      "Name": "a"
    }));
    const reciveType = (await ReciveTypeRepository.create({
      "Code": "05",
      "Name": "其它"
    }));

    const currency = (await CurrencyRepository.create({
      "Code": "RMB",
      "Name": "人民币"
    }));

    const voucherState = (await VoucherStateRepository.create({
      "Code": "00",
      "Name": "未审"
    }));
    const businessType = (await BusinessTypeRepository.create({
      "Code": "15",
      "Name": "普通销售"
    }));

    //await commitAll();

    const orderService = new CompositeService(SaleOrder, ctx, getRep);
    order = (await orderService.save({
      "Code": "SO-2019-08-0000000001-0054",
      "Status": 0,
      "Customer": cust,
      "CustomerPhone": "123",
      "SettleCustomer": cust,
      "pubuserdefnvc1": null,
      "OrigEarnestMoney": 0,
      "Department": dept, // 支持对象
      "Clerk": {
        "id": clerk.id, // 简化的对象id
      },
      "LinkMan": "123",
      "Warehouse": {
        "id": warehouse.id,
      },
      "Address": "123",
      "Member": null,
      "Mobilephone": null,
      "DiscountRate": 1,
      "ReciveType": {
        "id": reciveType.id,
      },
      "Project": null,
      "MemberAddress": null,
      "IdCollaborateUpVoucherType": null,
      "IdCollaborateUpVoucher": null,
      "DeliveryDate": new Date(1, 0, 1, 0, 0, 0, 0),
      "ContactPhone": "",
      "Currency": {
        "id": currency.id,
      },
      "DeliveryMode": null,
      "ContractCode": null,
      "ExchangeRate": 1,
      "SourceVoucherType": null,
      "IsAutoGenerateSaleOrderBOM": false,
      "IsAutoGenerateRouting": false,
      "VoucherDate": new Date(2019, 7, 5, 0, 0, 0, 0),
      "DirectCallSource": null,
      "ExternalVoucherCode": null,
      "SourceVoucherCode": null,
      "collaborateVoucherCode": null,
      "VoucherState": {
        "id": voucherState.id,
      },
      "IsModifiedCode": false,
      "BusinessType": {
        "id": businessType.id,
      },
      "IsNoModify": null,
      "SourceVoucherId": null,
      "IsSeparateByWareHouse": false,
      "pubuserdefnvc3": "10000000101",
      "priuserdefnvc5": null,
      "pubuserdefdecm3": null,
      "pubuserdefnvc4": null,
      "priuserdefdecm1": null,
      "priuserdefdecm2": null,
      "priuserdefnvc2": "10000000101",
      "priuserdefnvc3": "tplusdemo101",
      "pubuserdefdecm4": null,
      "priuserdefnvc6": "123",
      "priuserdefdecm3": null,
      "priuserdefnvc4": "",
      "Maker": "tplusdemo101",
      "priuserdefnvc7": null,
      "priuserdefnvc1": null,
      "pubuserdefdecm5": null,
      "Memo": "",
      "MakerId": 810,
      "Reviser": null,
      "AuditedDate": new Date(1, 0, 1, 0, 0, 0, 0),
      "Auditor": null,
      "PrintCount": 0,
      "Changer": null,
      "ChangeDate": new Date(1, 0, 1, 0, 0, 0, 0),
      "Closer": null,
      "CloseDate": null,
      "SaleOrderDetails": {
        $fields: ["Project", "Inventory", "Unit", "freeitem3", "Quantity", "SourceVoucherType", "PartnerInventoryName", "freeitem1", "freeitem0", "pubuserdefnvc4", "SourceVoucherCode", "PartnerInventoryCode", "InventoryBarCode", "DataSource", "SingleInvGrossProfit", "LatestCost", "IsPresent", "freeitem6", "freeitem7", "freeitem8", "freeitem9", "freeitem2", "freeitem4", "freeitem5", "UnitExchangeRate", "Quantity2", "Unit2", "Retailprice", "LatestPOrigTaxPrice", "LatestSaleOrigTaxPrice", "OrigDiscountAmount", "LowestSalePrice", "CompositionQuantity", "OrigTaxPrice", "OrigPrice", "OrigDiscountPrice", "TaxRate", "OrigDiscount", "DiscountRate", "OrigInvoiceTaxAmount", "OrigTaxAmount", "AvailableQuantity", "TaxPrice", "OrigTax", "ExistingQuantity", "priuserdefnvc4", "SourceVoucherId", "SourceVoucherDetailId", "GrossProfitRate", "TaxAmount", "AvailableCompositionQuantity", "DiscountPrice", "IsClose", "DiscountAmount", "Tax", "PriceStrategyTypeName", "Discount", "DeliveryDate", "Closer", "CloseDate", "GrossProfit", "PurchaseQuantity", "PurchaseQuantity2", "HasMRP", "Bom", "ExecutedQuantity", "ExecutedQuantity2", "ManufactureQuantity", "ManufactureQuantity2", "DistributionQuantity", "DistributionQuantity2", "TransferQuantity", "TransferQuantity2", "IsModifiedPrice", "TaxFlag", "LastModifiedField", "Code", "PriceStrategyTypeId", "PriceStrategySchemeIds", "PromotionVoucherIds", "IsMemberIntegral", "IsPromotionPresent", "idsaleOrderDTO", "IsNoModify", "PromotionPresentVoucherID", "PromotionPresentTypeID", "PromotionSingleTypeID", "PromotionSingleVoucherID", "ModifyFieldsForPromotion", "PromotionPresentVoucherCode", "PromotionSingleVoucherCode", "PromotionPresentGroupID", "PromotionSingleGroupID", "CashbackWay", "PromotionSingleVoucherTs", "SourceVoucherDetailTs", "SourceVoucherTs", "PromotionPresentVoucherTs", "HasPRA", "priuserdefdecm2", "ExistingCompositionQuantity", "PriceStrategySchemeNames", "PromotionVoucherCodes", "PromotionPresentBatchInfo", "PromotionPresentBatchType", "PromotionPriceBatchInfo", "PromotionPriceBatchType", "PromotionBatchMemo", "priuserdefnvc1", "priuserdefdecm1", "pubuserdefnvc1", "priuserdefnvc2", "priuserdefnvc3", "pubuserdefdecm2", "DetailMemo", "priuserdefdecm3", "priuserdefdecm4", "pubuserdefnvc3", "pubuserdefdecm3", "pubuserdefnvc2", "Warehouse", "Ts", "Status", "id"],
        $data: [
          [{
              "id": '3643',
              "Code": "...1",
              "Name": "1-1-101",
              "DynamicPropertyKeys": ["priuserdefnvc4", "priuserdefnvc5", "priuserdefnvc2", "priuserdefnvc3", "priuserdefnvc1", "withoutbargain", "haseverchanged", "ismodifiedcode", "isbatch_dy", "isqualityperiod_dy", "issingleunit_dy", "islaborcost_dy", "notcheckcolbyinvprop", "issingle_dy", "isfix_dy", "idunit_dy", "rateofunitgroup_dy", "allrateofunitgroup_dy", "islocation_dy"],
              "DynamicPropertyValues": ["", "", "", "", "", 0, "1", 1, false, false, false, false, "Batch", true, false, "434", [{
                  "Name": "套",
                  "RateOfExchange": 120
                }, {
                  "Name": "平米",
                  "RateOfExchange": 1
                }],
                [{
                  "Name": "套",
                  "RateOfExchange": 120
                }, {
                  "Name": "平米",
                  "RateOfExchange": 1
                }], false
              ],
              "Specification": "A",
              "ImageFile": "ca5355e4-f9c4-43d5-9c3e-343e86d3af44.jpg",
              "priuserdefdecm2": null,
              "priuserdefdecm1": null,
              "priuserdefnvc1": "",
              "priuserdefdecm3": null,
              "priuserdefdecm4": null,
              "priuserdefdecm5": null,
              "priuserdefnvc2": "",
              "priuserdefnvc3": "",
              "priuserdefnvc4": "",
              "priuserdefnvc5": "",
              "ProductInfo": null
            }, {
              "id": '434',
              "Code": "2",
              "Name": "平米"
            }, , 1, , , , , , , , , "", {
              "id": "2498",
              "Code": "08",
              "Name": "PC"
            }, -276.8, 276.8, false, , , , , , , , 120, 0.008333,
            {
              "id": '433',
              "Code": "1",
              "Name": "套"
            }, ,
            1000, 5, 0, , "1平米/0.008333套", 0, , 0, 0.03, , 1, , 0, , 0, 0, , , , , , 0, , 0, false, 0, 0, "", 0, new Date(1, 0, 1, 0, 0, 0, 0), , , -276.8, , , , , , , , , , , , , false, false, , "0000", , "", "", false, false, 7470, , , , , , , "", "", , , , , , , , false, 0, , "", "", "", "", "", "", "", , 0, , , , , , 0, 1, "1平米/0.008333套", 1, , {
              "id": 362,
              "Code": "00",
              "Name": "a"
            }, "00000000098e3f45", 0, '10664'
          ]
        ]
      },
      "Subscriptions": {
        $fields: ["SettleStyle", "BankAccount", "Project", "OrigProjectAmount", "ProjectAmount", "OrigAmount", "Amount", "BillNo", "SourceVoucherId", "SourceVoucherDetailId", "Status", "id", "Code"],
        $data: [
          [{
            "id": '15',
            "Code": "997",
            "Name": "转账"
          }, {
            "id": 1,
            "Code": "现金",
            "Name": "现金",
            "NewBalance": 5188.2
          }, , 0, , 5000, 5000, , , , 0, 1390, ]
        ]
      }
    }));
    await commitAll();

    // 保存成功
    const orderRepository = getRep('SaleOrder');
    order = await orderRepository.get(order.id);
    //console.log(JSON.stringify(order,null,2))
    require('fs').writeFileSync(__dirname + '/Datas/order.json', JSON.stringify(cutObj(order.toJS()), null, 2));
    expect(cutObj(order.toJS())).to.be.deep.eql(require('./Datas/order'));

    await orderService.saveStatus({
      id: order.id,
      status: 'effective',
      ts: order.ts
    });
    await commitAll();

    // 付款单不能自动生成，需要业务控制生单逻辑
    const generateService = new GenerateService(SaleOrder, ReceivePayment, ctx, getRep);
    const newEntity = await generateService.generate(order.id);
    expect(newEntity.constructor.name).to.be.eql('ReceivePayment');

    // 付款信息
    const receivePaymentRepository = getRep('ReceivePayment');
    const receivePayment = await receivePaymentRepository.get(newEntity.id);
    expect(receivePayment).to.not.null;
    //console.log(receivePayment)
  })

  it('采购订单，保存审核生效、【生成进货单】，保存审核', async () => {

    const generateService = new GenerateService(SaleOrder, SaleDelivery, ctx, getRep);
    let saleDelivery = await generateService.generate(order.id);
    await commitAll();
    expect(saleDelivery).to.not.null;
    const saleDeliveryService = new CompositeService(SaleDelivery, ctx, getRep);
    await saleDeliveryService.saveStatus({
      id: saleDelivery.id,
      ts: saleDelivery.ts,
      status: 'effective'
    });
    await commitAll();
    const SaleDeliveryRepository = getRep('SaleDelivery');
    saleDelivery = await SaleDeliveryRepository.get(saleDelivery.id);
    expect(saleDelivery).to.not.null;
    console.log(saleDelivery)
  })

})
