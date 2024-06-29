interface Pagination {
  total_pages: number;
  offset: number;
  per_page: number;
  total_entries: number;
  current_page: number;
}

type SortingField = Record<string, string>;

interface Sorting {
  fields: SortingField[];
  sortable_fields: string[];
}

interface Filter {
  settled: string;
}

interface Permissions {
  index: boolean;
  create: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
}

interface ImagePermissions {
  permissions: Permissions;
}

interface Image {
  original: string;
  large: string;
  small: string;
  micro: string;
}

interface CurrencyAmount {
  currency: string;
  fractional: number;
}

interface ShareMeta {
  type: string;
  multiplier: number;
}

interface Share {
  id: string;
  meta: ShareMeta;
  member_instance_id: string | null;
  member_id: string;
  member_instance: unknown;
  source_amount: CurrencyAmount;
  amount: CurrencyAmount;
}

export interface Expense {
  id: string;
  name: string;
  list_id: string;
  settle_id: string | null;
  payed_by_member_instance_id: string | null;
  status: string;
  payed_on: string;
  exchange_rate: string;
  payed_by_id: string;
  category: string | null;
  created_at: number;
  updated_at: number;
  source_amount: CurrencyAmount;
  amount: CurrencyAmount;
  shares: { share: Share }[];
  recurring_task: unknown;
  image: {
    image: Image;
  };
}

interface Data {
  permissions: Permissions & { image: ImagePermissions };
  expense: Expense;
}

export interface ApiResponse {
  pagination: Pagination;
  sorting: Sorting;
  filter: Filter;
  permissions: Permissions;
  data: Data[];
}
