import { ApiResponse, Expense } from './api.interface';
import * as fs from 'fs/promises';

function getEnv() {
  const env = { cookie: process.env.COOKIE };

  if (env.cookie === undefined) {
    throw new Error('The ENV variable COOKIE must be set');
  }

  return env;
}

// Function to convert JSON to CSV
function expensesToCsv(expenses: Expense[]): string {
  if (expenses.length === 0) {
    return '';
  }
  const headers = Object.keys(expenses[0]) as (keyof Expense)[];

  const csvRows = expenses.map(row =>
    headers
      .map(fieldName =>
        JSON.stringify(row[fieldName], (_, value: Record<string, unknown>) => value ?? '')
      )
      .join(',')
  );
  return [headers.join(','), ...csvRows].join('\n');
}

export async function getPage(
  listId: string,
  sort: Record<'payed_on' | 'created_at', 'desc' | 'asc'>,
  filter: Record<'settled', boolean>,
  page = '1',
  per_page = '100',
  cookie: string
): Promise<ApiResponse> {
  const baseUrl = `https://app.splitser.com/api/lists/${listId}/list_items`;
  const params = new URLSearchParams({ page, per_page });

  Object.entries(sort).forEach(([key, value]) => {
    params.append(`sort[${key}]`, value.toString());
  });

  Object.entries(filter).forEach(([key, value]) => {
    params.append(`filter[${key}]`, value.toString());
  });

  const url = `${baseUrl}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'accept-language': 'en',
      'accept-version': '10',
      cookie,
    },
    method: 'GET',
  });

  return (await response.json()) as ApiResponse;
}

async function run() {
  const { cookie } = getEnv();

  const listId = '3ace0ff4-0229-4b05-8b25-f01684c44f57';
  const sort = { payed_on: 'desc' as const, created_at: 'desc' as const };
  const filter = { settled: false };
  const page = '1'; // Example of using a different page
  const per_page = '500'; // Example of changing the number of items per page
  const result = await getPage(listId, sort, filter, page, per_page, cookie);

  const csvData = expensesToCsv(result.data.map(data => data.expense)); // Adjust according to the actual structure of ApiResponse
  await fs.writeFile('expenses.csv', csvData);
  await fs.writeFile(
    'expenses.json',
    JSON.stringify(
      result.data.map(data => data.expense),
      undefined,
      2
    )
  );

  console.log('done');
}

run().catch(error => console.error(error));
