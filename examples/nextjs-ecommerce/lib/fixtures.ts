export interface WidgetFixture {
  data: Record<string, unknown>[];
  columns?: Array<{ fieldId: string; label: string; dataType: string }>;
}

export const ecommerceWidgetData: Record<string, WidgetFixture> = {
  'kpi-gmv': {
    data: [{ gmv: 428000, previousGmv: 396000 }],
  },
  'kpi-orders': {
    data: [{ orders: 6820, previousOrders: 6410 }],
  },
  'kpi-aov': {
    data: [{ aov: 62.8, previousAov: 61.1 }],
  },
  'chart-revenue-trend': {
    data: [
      { month: 'Jan', gmv: 65000, orders: 1080 },
      { month: 'Feb', gmv: 70000, orders: 1125 },
      { month: 'Mar', gmv: 73500, orders: 1170 },
      { month: 'Apr', gmv: 68800, orders: 1110 },
      { month: 'May', gmv: 78100, orders: 1235 },
      { month: 'Jun', gmv: 82600, orders: 1300 },
    ],
  },
  'chart-channel-mix': {
    data: [
      { channel: 'Direct', gmv: 168000 },
      { channel: 'Marketplace', gmv: 121000 },
      { channel: 'Retail Partners', gmv: 81000 },
      { channel: 'Email Campaigns', gmv: 58000 },
    ],
  },
  'table-top-products': {
    columns: [
      { fieldId: 'product', label: 'Product', dataType: 'string' },
      { fieldId: 'units', label: 'Units Sold', dataType: 'integer' },
      { fieldId: 'gmv', label: 'Revenue', dataType: 'string' },
      { fieldId: 'channel', label: 'Channel', dataType: 'string' },
    ],
    data: [
      { product: 'Nimbus Running Shoe', units: 1480, gmv: '$96,200', channel: 'Direct' },
      { product: 'Weekender Tote', units: 910, gmv: '$74,600', channel: 'Marketplace' },
      { product: 'Merino Layer Tee', units: 1320, gmv: '$69,800', channel: 'Retail Partners' },
      { product: 'Altitude Bottle', units: 2210, gmv: '$58,900', channel: 'Email Campaigns' },
      { product: 'Trail Cap', units: 1940, gmv: '$44,100', channel: 'Direct' },
    ],
  },
};

export const ecommerceFilterOptions: Record<string, string[]> = {
  'filter-region': ['North America', 'Europe', 'APAC'],
  'filter-channel': ['Direct', 'Marketplace', 'Retail Partners', 'Email Campaigns'],
};