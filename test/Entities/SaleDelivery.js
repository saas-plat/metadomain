const {
  MetaEntity,
  CompositeData,
} = require('../../lib');

// 销货
module.exports = MetaEntity.createModel(CompositeData, 'SaleDelivery', {
  "Code": {
    type: "string",
    mapping: 'code'
  },
  "Name": {
    type: "string",
    mapping: 'name'
  },
  "IsSeparateByWareHouse": {
    "type": "boolean"
  },
  "OrigAllowances": {
    "type": "number"
  },

  "RecivingMaturity": {
    "type": "date"
  },
  "VoucherDate": {
    "type": "date"
  },
  "OrigSettleAmount": {
    "type": "number"
  },
  "Code": {
    "type": "string"
  },
  "LinkMan": {
    "type": "string"
  },
  "ContactPhone": {
    "type": "string"
  },
  "IsAutoGenerateInvoice": {
    "type": "boolean"
  },
  "Address": {
    "type": "string"
  },
  "Memo": {
    "type": "string"
  },
  "DeliveryDate": {
    "type": "date"
  },
  "OrigTaxAmount": {
    "type": "number"
  },
  "IdbusinessType": {
    "type": "number"
  },
  "ExternalCode": {
    "type": "string"
  },
  "ExternalVoucherCode": {
    "type": "string"
  },
  "CustomerPhone": {
    "type": "string"
  },
  "DynamicPropertyKeys": {
    "type": "array"
  },
  "DynamicPropertyValues": {
    "type": "array"
  },
  "Warehouse": {
    "type": "Warehouse",
  },
  "Project": {
    "type": "Project",
  },
  "DeliveryMode": {
    "type": "DeliveryMode",
  },
  "VoucherState": {
    "type": "VoucherState",
  },
  "InvoiceType": {
    "type": "InvoiceType",
  },
  "Customer": {
    "type": "Customer",
  },
  "SettleCustomer": {
    "type": "Customer",
  },
  "Department": {
    "type": "Department",
  },
  "Clerk": {
    "type": "Clerk",
  },
  "SaleDeliveryDetails": {
    "type": "array",
    "fields": {
      "ExistingQuantity": {
        "type": "number"
      },
      "AvailableQuantity": {
        "type": "number"
      },
      "PromotionPresentVoucherID": {
        "type": "number"
      },
      "PromotionPresentTypeID": {
        "type": "number"
      },
      "PromotionSingleTypeID": {
        "type": "number"
      },
      "PromotionSingleVoucherID": {
        "type": "number"
      },
      "PriceStrategyTypeId": {
        "type": "number"
      },
      "OrigPrice": {
        "type": "number"
      },
      "Quantity": {
        "type": "number"
      },
      "Code": {
        "type": "string"
      },
      "ID": {
        "type": "number"
      },
      "OrigTaxAmount": {
        "type": "number"
      },
      "SaleOrderDetailId": {
        "type": "number"
      },
      "OrigTaxPrice": {
        "type": "number"
      },
      "IsPresent": {
        "type": "boolean"
      },
      "DetailMemo": {
        "type": "string"
      },
      "LatestCost": {
        "type": "number"
      },
      "LatestPOrigTaxPrice": {
        "type": "number"
      },
      "LowestSalePrice": {
        "type": "number"
      },
      "LatestSaleOrigTaxPrice": {
        "type": "number"
      },
      "DynamicPropertyKeys": {
        "type": "array"
      },
      "DynamicPropertyValues": {
        "type": "array"
      },
      "Warehouse": {
        "type": "Warehouse",

      },
      "Project": {
        "type": "Project",

      },
      "Inventory": {
        "type": "Inventory",
      },
      "Unit": {
        "type": "Unit",
      }
    }
  },
  "SaleDeliverySettlements": {
    "type": "array",
    "fields": {
      "ID": {
        "type": "number"
      },
      "Code": {
        "type": "string"
      },
      "SettleStyle": {
        "type": "SettleStyle",
      },
      "BankAccount": {
        "type": "BankAccount",
      }
    }
  }

})
