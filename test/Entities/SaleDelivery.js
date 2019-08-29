const {
  MetaEntity,
  CompositeData,
} = require('../../lib');

// 销货
module.exports = MetaEntity.create(CompositeData, 'SaleDelivery', {
  "Code": {
    type: "string",
    mapping: 'code'
  },
  "Name": {
    type: "string",
    mapping: 'name'
  },
  "IsSeparateByWareHouse": {
    "Type": "boolean"
  },
  "OrigAllowances": {
    "Type": "number"
  },

  "RecivingMaturity": {
    "Type": "date"
  },
  "VoucherDate": {
    "Type": "date"
  },
  "OrigSettleAmount": {
    "Type": "number"
  },
  "Code": {
    "Type": "string"
  },
  "LinkMan": {
    "Type": "string"
  },
  "ContactPhone": {
    "Type": "string"
  },
  "IsAutoGenerateInvoice": {
    "Type": "boolean"
  },
  "Address": {
    "Type": "string"
  },
  "Memo": {
    "Type": "string"
  },
  "DeliveryDate": {
    "Type": "date"
  },
  "OrigTaxAmount": {
    "Type": "number"
  },
  "IdbusinessType": {
    "Type": "number"
  },
  "ExternalCode": {
    "Type": "string"
  },
  "ExternalVoucherCode": {
    "Type": "string"
  },
  "CustomerPhone": {
    "Type": "string"
  },
  "DynamicPropertyKeys": {
    "Type": "array"
  },
  "DynamicPropertyValues": {
    "Type": "array"
  },
  "Warehouse": {
    "Type": "Warehouse",
  },
  "Project": {
    "Type": "Project",
  },
  "DeliveryMode": {
    "Type": "DeliveryMode",
  },
  "VoucherState": {
    "Type": "VoucherState",
  },
  "InvoiceType": {
    "Type": "InvoiceType",
  },
  "Customer": {
    "Type": "Customer",
  },
  "SettleCustomer": {
    "Type": "Customer",
  },
  "Department": {
    "Type": "Department",
  },
  "Clerk": {
    "Type": "Clerk",
  },
  "SaleDeliveryDetails": {
    "Type": "array",
    "Fields": {
      "ExistingQuantity": {
        "Type": "number"
      },
      "AvailableQuantity": {
        "Type": "number"
      },
      "PromotionPresentVoucherID": {
        "Type": "number"
      },
      "PromotionPresentTypeID": {
        "Type": "number"
      },
      "PromotionSingleTypeID": {
        "Type": "number"
      },
      "PromotionSingleVoucherID": {
        "Type": "number"
      },
      "PriceStrategyTypeId": {
        "Type": "number"
      },
      "OrigPrice": {
        "Type": "number"
      },
      "Quantity": {
        "Type": "number"
      },
      "Code": {
        "Type": "string"
      },
      "ID": {
        "Type": "number"
      },
      "OrigTaxAmount": {
        "Type": "number"
      },
      "SaleOrderDetailId": {
        "Type": "number"
      },
      "OrigTaxPrice": {
        "Type": "number"
      },
      "IsPresent": {
        "Type": "boolean"
      },
      "DetailMemo": {
        "Type": "string"
      },
      "LatestCost": {
        "Type": "number"
      },
      "LatestPOrigTaxPrice": {
        "Type": "number"
      },
      "LowestSalePrice": {
        "Type": "number"
      },
      "LatestSaleOrigTaxPrice": {
        "Type": "number"
      },
      "DynamicPropertyKeys": {
        "Type": "array"
      },
      "DynamicPropertyValues": {
        "Type": "array"
      },
      "Warehouse": {
        "Type": "Warehouse",

      },
      "Project": {
        "Type": "Project",

      },
      "Inventory": {
        "Type": "Inventory",
      },
      "Unit": {
        "Type": "Unit",
      }
    }
  },
  "SaleDeliverySettlements": {
    "Type": "array",
    "Fields": {
      "ID": {
        "Type": "number"
      },
      "Code": {
        "Type": "string"
      },
      "SettleStyle": {
        "Type": "SettleStyle",
      },
      "BankAccount": {
        "Type": "BankAccount",
      }
    }
  }

})
