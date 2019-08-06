const {
  Repository,
  MetaEntity,
  CompositeService,
  GenerateService
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
 

describe('单据', () => {

  it('创建采购订单，保存同时【生成订金的付款单】 ', async () => {
    const Order = MetaEntity.create(CompositeData, 'SaleOrder', {

    })

    //   await order.save({
    //     "ID": 7470,
    // 	"Code": "SO-2019-08-0000000001-0054",
    // 	"Ts": "00000000098e3f49",
    // 	"Status": 0,
    // 	"Customer": {
    // 		"ID": 2426,
    // 		"Code": "00000001",
    // 		"Name": "广东JH",
    // 		"priuserdefnvc1": "",
    // 		"PartnerAbbName": "广东JH",
    // 		"priuserdefnvc3": "",
    // 		"priuserdefnvc4": "",
    // 		"priuserdefnvc5": "",
    // 		"priuserdefdecm2": null,
    // 		"priuserdefdecm3": null,
    // 		"priuserdefdecm4": null,
    // 		"priuserdefdecm5": null,
    // 		"priuserdefdecm1": -8614.1,
    // 		"priuserdefnvc2": "",
    // 		"UuNo": null,
    // 		"Representative": "",
    // 		"District": null,
    // 		"SaleCreditDays": null
    // 	},
    // 	"CustomerPhone": "123",
    // 	"SettleCustomer": {
    // 		"ID": 2426,
    // 		"Code": "00000001",
    // 		"Name": "广东JH",
    // 		"priuserdefdecm1": -8614.1,
    // 		"ARBalance": -9367.9,
    // 		"PartnerAbbName": "广东JH",
    // 		"priuserdefnvc1": "",
    // 		"priuserdefnvc2": "",
    // 		"priuserdefnvc3": "",
    // 		"priuserdefnvc4": "",
    // 		"priuserdefnvc5": "",
    // 		"priuserdefdecm2": null,
    // 		"priuserdefdecm3": null,
    // 		"priuserdefdecm4": null,
    // 		"priuserdefdecm5": null
    // 	},
    // 	"pubuserdefnvc1": null,
    // 	"OrigEarnestMoney": 0,
    // 	"Department": {
    // 		"ID": 123,
    // 		"Code": "83103",
    // 		"Name": "市场一部"
    // 	},
    // 	"Clerk": {
    // 		"ID": 145,
    // 		"Code": "tplusdemo101",
    // 		"Name": "tplusdemo101"
    // 	},
    // 	"LinkMan": "123",
    // 	"Warehouse": {
    // 		"ID": 362,
    // 		"Code": "00",
    // 		"Name": "a"
    // 	},
    // 	"Address": "123",
    // 	"Member": null,
    // 	"Mobilephone": null,
    // 	"DiscountRate": 1,
    // 	"ReciveType": {
    // 		"Id": "7",
    // 		"Code": "05",
    // 		"Name": "其它"
    // 	},
    // 	"Project": null,
    // 	"MemberAddress": null,
    // 	"IdCollaborateUpVoucherType": null,
    // 	"IdCollaborateUpVoucher": null,
    // 	"DeliveryDate": new Date(1, 0, 1, 0, 0, 0, 0),
    // 	"ContactPhone": "",
    // 	"Currency": {
    // 		"ID": 4,
    // 		"Code": "RMB",
    // 		"Name": "人民币"
    // 	},
    // 	"DeliveryMode": null,
    // 	"ContractCode": null,
    // 	"ExchangeRate": 1,
    // 	"SourceVoucherType": null,
    // 	"IsAutoGenerateSaleOrderBOM": false,
    // 	"IsAutoGenerateRouting": false,
    // 	"VoucherDate": new Date(2019, 7, 5, 0, 0, 0, 0),
    // 	"DirectCallSource": null,
    // 	"ExternalVoucherCode": null,
    // 	"SourceVoucherCode": null,
    // 	"collaborateVoucherCode": null,
    // 	"VoucherState": {
    // 		"Id": "181",
    // 		"Code": "00",
    // 		"Name": "未审"
    // 	},
    // 	"IsModifiedCode": false,
    // 	"BusinessType": {
    // 		"ID": 65,
    // 		"Code": "15",
    // 		"Name": "普通销售"
    // 	},
    // 	"IsNoModify": null,
    // 	"SourceVoucherId": null,
    // 	"IsSeparateByWareHouse": false,
    // 	"pubuserdefnvc3": "10000000101",
    // 	"priuserdefnvc5": null,
    // 	"pubuserdefdecm3": null,
    // 	"pubuserdefnvc4": null,
    // 	"priuserdefdecm1": null,
    // 	"priuserdefdecm2": null,
    // 	"priuserdefnvc2": "10000000101",
    // 	"priuserdefnvc3": "tplusdemo101",
    // 	"pubuserdefdecm4": null,
    // 	"priuserdefnvc6": "123",
    // 	"priuserdefdecm3": null,
    // 	"priuserdefnvc4": "",
    // 	"Maker": "tplusdemo101",
    // 	"DataSource": {
    // 		"Id": "2498",
    // 		"Code": "08",
    // 		"Name": "T+移动端"
    // 	},
    // 	"priuserdefnvc7": null,
    // 	"priuserdefnvc1": null,
    // 	"pubuserdefdecm5": null,
    // 	"Memo": "",
    // 	"MakerId": 810,
    // 	"Reviser": null,
    // 	"AuditedDate": new Date(1, 0, 1, 0, 0, 0, 0),
    // 	"Auditor": null,
    // 	"PrintCount": 0,
    // 	"Changer": null,
    // 	"ChangeDate": new Date(1, 0, 1, 0, 0, 0, 0),
    // 	"MarketingOrgan": {
    // 		"ID": 1,
    // 		"Code": "00",
    // 		"Name": "丽佳商贸公司"
    // 	},
    // 	"Closer": null,
    // 	"CloseDate": null,
    // 	"SaleOrderDetails":
    // 		[, {
    // 			"ID": 3643,
    // 			"Code": "...1",
    // 			"Name": "1-1-101",
    // 			"DynamicPropertyKeys": ["priuserdefnvc4", "priuserdefnvc5", "priuserdefnvc2", "priuserdefnvc3", "priuserdefnvc1", "withoutbargain", "haseverchanged", "ismodifiedcode", "isbatch_dy", "isqualityperiod_dy", "issingleunit_dy", "islaborcost_dy", "notcheckcolbyinvprop", "issingle_dy", "isfix_dy", "idunit_dy", "rateofunitgroup_dy", "allrateofunitgroup_dy", "islocation_dy"],
    // 			"DynamicPropertyValues": ["", "", "", "", "", 0, "1", 1, false, false, false, false, "Batch", true, false, "434", [{
    // 					"Name": "套",
    // 					"RateOfExchange": 120
    // 				}, {
    // 					"Name": "平米",
    // 					"RateOfExchange": 1
    // 				}],
    // 				[{
    // 					"Name": "套",
    // 					"RateOfExchange": 120
    // 				}, {
    // 					"Name": "平米",
    // 					"RateOfExchange": 1
    // 				}], false
    // 			],
    // 			"Specification": "A",
    // 			"ImageFile": "ca5355e4-f9c4-43d5-9c3e-343e86d3af44.jpg",
    // 			"priuserdefdecm2": null,
    // 			"priuserdefdecm1": null,
    // 			"priuserdefnvc1": "",
    // 			"priuserdefdecm3": null,
    // 			"priuserdefdecm4": null,
    // 			"priuserdefdecm5": null,
    // 			"priuserdefnvc2": "",
    // 			"priuserdefnvc3": "",
    // 			"priuserdefnvc4": "",
    // 			"priuserdefnvc5": "",
    // 			"ProductInfo": null
    // 		}, {
    // 			"ID": 434,
    // 			"Code": "2",
    // 			"Name": "平米"
    // 		}, , 1, , , , , , , , "", {
    // 			"Id": "2498",
    // 			"Code": "08",
    // 			"Name": "T+移动端"
    // 		},
    //     -276.8, 276.8, false, , , , , , , , 120, 0.008333,
    //      {
    // 			"ID": 433,
    // 			"Code": "1",
    // 			"Name": "套"
    // 		}, ,
    //     1000, 5, 0, , "1平米/0.008333套", 0, , 0, 0.03, , 1, , 0, , 0, 0, , , , , , 0, , 0, false, 0, 0, "", 0, new Date(1, 0, 1, 0, 0, 0, 0), , , -276.8, , , , , , , , , , , , , false, false, , "0000", , "", "", false, false, 7470, , , , , , , "", "", , , , , , , , false, 0, , "", "", "", "", "", "", "", , 0, , , , , , 0, 1, "1平米/0.008333套", 1, , {
    // 			"ID": 362,
    // 			"Code": "00",
    // 			"Name": "a"
    // 		}, "00000000098e3f45", 0, 10664]
    // 	]
    // }
    //   })
  })

  it('采购订单，保存审核生效、【生成进货单】，保存审核', async () => {

  })

})
