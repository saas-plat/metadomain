const {
  MetaEntity,
  CompositeData,
} = require('../../lib');
// 订单
module.exports = createModel(CompositeData, 'SaleOrder', {
  "Mobilephone": "string",
  "Memberaddress": "string",
  "DeliveryDate": "date",
  "DiscountRate": "number",
  "DiscountAmount": "string",
  "OrigDiscountAmount": "string",
  "OrigReceiveAmount": "number",
  "ReceiveAmount": "number",
  "ExchangeRate": "number",
  "DeliveryMode": "string",
  "Address": "string",
  "LinkMan": "string",
  "ReciveType": {
    "type": "ReciveType"
  },
  "ContractCode": "string",
  "OrigEarnestMoney": "number",
  "EarnestMoney": "number",
  "Memo": "string",
  "OrigAmount": "number",
  "Amount": "number",
  "OrigTaxAmount": "number",
  "TaxAmount": "number",
  "ContactPhone": "string",
  "CustomerPhone": "string",
  "IsSaleOut": "string",
  "IsCancel": "string",
  "IsSaleDelivery": "string",
  "IsAutoGenerateSaleOrderBOM": "boolean",
  "IsAutoGenerateRouting": "boolean",
  "SourceVoucherId": "string",
  "SourceVoucherCode": "string",
  "MadeDate": "date",
  "Auditor": "string",
  "AuditorId": "number",
  "Reviser": "string",
  "AuditedDate": "date",
  "IsModifiedCode": "boolean",
  "DocNo": "string",
  "DocClass": "string",
  "AccountingPeriod": "number",
  "DocId": "string",
  "ExternalCode": "string",
  "ExternalVoucherCode": "string",
  "AccountingYear": "number",
  "SequenceNumber": "number",

  "Project": "Project",

  "Clerk": "string",

  "Currency": "Currency",

  "Department": "Department",
  "BusinessType": "BusinessType",
  "SaleOrderInstallmentPlans": ["string"],

  "SourceVoucherType": "string",

  "SettleCustomer": "Partner",
  "Warehouse": "Warehouse",

  "IsNoModify": "string",
  "ReferenceCount": "number",
  "PrintCount": "number",

  "CollaborateState": "string",

  "CollaborateVoucherCode": "string",
  "IsSeparateByWareHouse": "boolean",
  "HasRecordCredit": "boolean",
  "IsAutoWarehouse": "boolean",
  "InputDataSource": "string",
  "Closer": "string",
  "CloseDate": "date",
  "DataSource": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "boolean",
    "IsDelete": "number",
    "IsExtend": "number",
    "remark": "string",
    "DefaultValue": "string",
    "EnumId": "string"
  },

  "Customer": "Partner",
  "Changer": "string",
  "ChangerId": "string",
  "ChangeDate": "date",

  "Member": "string",
  "DetailFieldNames": ["string"],
  "VoucherState": "VoucherState",
  "VoucherDate": "date",
  "IsCarriedForwardOut": "boolean",
  "IsCarriedForwardIn": "boolean",
  "Maker": "string",
  "MakerId": "number",
  "CreatedTime": "date",

  "MarketingOrgan": "MarketingOrgan",
  "DirectCallSource": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "boolean",
    "IsDelete": "number",
    "IsExtend": "number",
    "remark": "string",
    "DefaultValue": "string",
    "EnumId": "string"
  },
  "WeakTypeDtoName": "string",
  "DtoClassName": "string",
  "IsWeakType": "boolean",
  "AliName": "string",
  "Status": "number",
  "EnableHasChanged": "boolean",
  "ChangedProperty": ["string"],
  "DynamicPropertyKeys": ["string"],
  "DynamicPropertyValues": ["string"],

  "DeleteID": "number",
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "Updated": "date",
  "UpdatedBy": "string",
  "InnerSearchLevel": "number",
  "RecordChange": "boolean",
  "InnerPropInParentRecure": "string",

  "CaseSensitive": "boolean",
  "RecordDynamicNullValue": "boolean",
  "data": "object",

  "Subscriptions": [{
		"SettleStyle": "SettleStyle",
		"BankAccount": "BankAccount",
		"Project": "Project",
		"OrigProjectAmount": "number",
		"ProjectAmount": "number",
		"OrigAmount": "number",
		"Amount": "number",
		"BillNo": "string",
		"SourceVoucherId": "string",
		"SourceVoucherDetailId": "string",
		"Status": "string",
		"id": "string",
		"Code": "string",
  }],

  "SaleOrderDetails": [{
    "RelationIdNameWithHead": "string",
    "RelationNameWithHead": "string",
    "BasePrice": "string",
    "BaseDiscountPrice": "string",
    "BaseTaxPrice": "string",
    "DeliveryDate": "date",
    "ManufactureQuantity": "string",
    "ManufactureQuantity2": "string",
    "PurchaseQuantity": "string",
    "PurchaseQuantity2": "string",
    "DeliveryQuantity": "string",
    "DeliveryQuantity2": "string",
    "SaleOutQuantity": "string",
    "SaleOutQuantity2": "string",
    "ExecutedQuantity": "string",
    "ExecutedQuantity2": "string",
    "DistributionQuantity": "string",
    "TransferQuantity": "string",
    "TransferQuantity2": "string",
    "DistributionQuantity2": "string",
    "ReferenceCount": "number",
    "LastModifiedField": "string",
    "HasPRA": "boolean",
    "HasOrderBOM": "boolean",
    "PraRequireTimes": "number",
    "IsNoModify": "string",

    "DestVoucherType": "string",

    "Bom": "string",
    "DetailMemo": "string",
    "DataSource": {

      "Code": "string",
      "Name": "string",
      "Position": "number",
      "CustomUse": "boolean",
      "IsDelete": "number",
      "IsExtend": "number",
      "remark": "string",
      "DefaultValue": "string",
      "EnumId": "string"
    },
    "SaleOrderSourceRelations": ["string"],
    "PriceStrategyTypeName": "string",
    "PriceStrategyTypeId": "number",
    "PriceStrategySchemeIds": "string",
    "PriceStrategySchemeNames": "string",
    "PromotionVoucherCodes": "string",
    "PromotionVoucherIds": "string",
    "IsMemberIntegral": "boolean",
    "IsPromotionPresent": "boolean",
    "PromotionPresentVoucherID": "string",
    "PromotionPresentTypeID": "string",
    "PromotionSingleTypeID": "string",
    "PromotionSingleVoucherID": "string",
    "ModifyFieldsForPromotion": "string",
    "PromotionPresentVoucherCode": "string",
    "PromotionSingleVoucherCode": "string",
    "PromotionPresentGroupID": "string",
    "PromotionSingleGroupID": "string",
    "CashbackWay": "string",
    "PromotionSingleVoucherTs": "string",
    "PromotionPresentVoucherTs": "string",
    "IsClose": "boolean",
    "Closer": "date",
    "CloseDate": "date",
    "PartnerInventoryCode": "string",
    "PartnerInventoryName": "string",
    "OldIdunit": "string",
    "OldUnit": "string",
    "IsPresent": "boolean",
    "CostPrice": "string",
    "CostPriceGetType": "string",
    "CostAmount": "string",
    "DiscountRate": "number",
    "TaxFlag": "boolean",
    "TaxRate": "number",
    "OrigPrice": "string",
    "OrigDiscountPrice": "number",
    "OrigTaxAmount": "number",
    "OrigDiscountAmount": "number",
    "OrigTaxPrice": "number",
    "OrigTax": "number",
    "OrigDiscount": "string",
    "DiscountPrice": "number",
    "DiscountAmount": "number",
    "Tax": "number",
    "TaxPrice": "number",
    "TaxAmount": "number",
    "Discount": "string",
    "Price": "string",
    "LatestCost": "string",
    "LatestPOrigTaxPrice": "string",
    "LatestSaleOrigTaxPrice": "string",
    "LowestSalePrice": "string",
    "SingleInvGrossProfit": "string",
    "GrossProfit": "string",
    "GrossProfitRate": "string",
    "IsModifiedPrice": "boolean",

    "SourceVoucherTs": "string",
    "SourceVoucherDetailTs": "string",
    "OutFields": {},
    "AddItem": "string",
    "MarkPosition": "string",
    "RetailPrice": "string",

    "Inventory": {
      "type": "Inventory"
    },

    "Warehouse": "string",

    "Unit": {
      "type": "Unit"
    },

    "Unit2": "string",

    "SubUnit": "string",

    "BaseUnit": {
      "type": "Unit"
    },
    "Quantity": "number",
    "Quantity2": "string",
    "BaseQuantity": "number",
    "SubQuantity": "string",
    "UnitExchangeRate": "string",
    "ChangeRate": "string",
    "AvailableQuantity": "string",
    "ExistingQuantity": "string",
    "AvailableCompositionQuantity": "string",
    "ExistingCompositionQuantity": "string",
    "Batch": "string",
    "ProductionDate": "date",
    "ExpiryDate": "date",
    "SourceVoucherDetailId": "string",
    "SourceVoucherCode": "string",
    "SourceVoucherId": "string",

    "Project": "Project",
    "CompositionQuantity": "string",

    "Memo": "string",
    "SourceVoucherType": "string",
    "InventoryBarCode": "string",
    "BoxNumber": "string",
    "PromotionBatchMemo": "string",
    "PromotionPresentBatchInfo": "string",
    "PromotionPresentBatchType": "string",
    "PromotionPriceBatchInfo": "string",
    "PromotionPriceBatchType": "string",
    "WeakTypeDtoName": "string",
    "DtoClassName": "string",
    "IsWeakType": "boolean",
    "AliName": "string",
    "Status": "number",
    "EnableHasChanged": "boolean",
    "ChangedProperty": ["string"],
    "DynamicPropertyKeys": ["string"],
    "DynamicPropertyValues": ["string"],

    "DeleteID": "number",
    "Name": "string",
    "Code": "string",
    "Updated": "date",
    "UpdatedBy": "string",
    "InnerSearchLevel": "number",
    "RecordChange": "boolean",
    "InnerPropInParentRecure": "string",

    "CaseSensitive": "boolean",
    "RecordDynamicNullValue": "boolean",
    "data": "object"
  }],

})

//throw module.exports.fields.find(it=>it.key === 'SaleOrderDetails').fields
