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

export interface Image {
  original: string;
  large: string;
  small: string;
  micro: string;
}

export interface CurrencyAmount {
  currency: string;
  fractional: number;
}

interface ShareMeta {
  type: string;
  multiplier: number;
}

export interface Share {
  id: string;
  meta: ShareMeta;
  member_instance_id: string | null;
  member_id: string;
  member_instance: unknown;
  source_amount: CurrencyAmount;
  amount: CurrencyAmount;
}

export interface Category {
  id: number;
  sub_id: number;
  main_id: number;
  icon: string;
  category_source: string;
  main_description: string;
  sub_description: string;
}

export interface Expense {
  id: string;
  name: string;
  list_id: string;
  settle_id: string | null;
  payed_by_member_instance_id: string | null;
  status: 'activate' | 'deleted';
  payed_on: string;
  exchange_rate: string;
  payed_by_id: string;
  category: Category | null;
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

export interface Income {
  id: string;
  name: string;
  list_id: string;
  settle_id: string | null;
  status: 'activate' | 'deleted';

  exchange_rate: string;
  received_by_id: string;
  received_by_member_instance_id: string | null;
  received_on: string;
  created_at: number;
  updated_at: number;
  category: Category | null;
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
  expense?: Expense;
  income?: Income;
  list_payment?: { id: string; status: 'activate' | 'deleted' };
}

export interface ApiResponse {
  pagination: Pagination;
  sorting: Sorting;
  filter: Filter;
  permissions: Permissions;
  data: Data[];
}
