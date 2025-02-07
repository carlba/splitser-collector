import {
  ApiResponse,
  Category,
  CurrencyAmount,
  Expense,
  Image,
  Income,
  Share,
} from './api.interface';
import * as fs from 'fs/promises';
import { Temporal } from '@js-temporal/polyfill';
import path from 'path';
import 'dotenv/config';

const isNotNull = <T>(item: T | null): item is T => item !== null;
type Transaction = (Expense & { type: 'expense' }) | (Income & { type: 'income' });

interface Env {
  cookie: string;
}

function getEnv(): Env {
  const env: Partial<Env> = { cookie: process.env.COOKIE };

  if (env.cookie === undefined) {
    throw new Error('The ENV variable COOKIE must be set');
  }

  return env as Env;
}

// Function to convert JSON to CSV
function transactionsToCsv(data: ApiResponse['data']): string {
  if (data.length === 0) {
    return '';
  }

  const typedTransactions: Transaction[] = data
    .map(transaction => {
      if (transaction.expense) {
        return { ...transaction.expense, type: 'expense' as const };
      } else if (transaction.income) {
        return { ...transaction.income, type: 'income' as const };
      } else if (transaction.list_payment) {
        if (transaction.list_payment.status === 'deleted') {
          console.log(
            'Disregarding list_action transaction because deleted',
            transaction.list_payment.id
          );
          return null;
        } else {
          console.log('Warning not deleted payment', { id: transaction.list_payment.id });
          return null;
        }
      } else {
        console.log('Unknown transaction type', transaction);
        return null;
      }
    })
    .filter(isNotNull)
    .sort((a, b) => b.created_at - a.created_at);

  // const headers = Object.keys(typedTransactions[0]) as (keyof Expense)[];

  type ParserFunction = (value: unknown, name: string) => string;

  const isParserFunction = (fn: unknown): fn is ParserFunction => {
    return typeof fn === 'function';
  };

  const headers = [
    'id',
    'name',
    'payed_by_id',
    'created_at',
    'updated_at',
    'source_amount',
    'shares',
    'category',
    'payed_on',
    'amount',
    'status',
    'type',
    'image',
    'received_by_id',
    'received_on',
    'recurring_task',
    'list_id',
    'settle_id',
    'payed_by_member_instance_id',
    'received_by_member_instance_id',
    'exchange_rate',
  ];

  const dateTimeParser: ParserFunction = (value: unknown, name: string): string => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return `${name}: value has to be of type string or number`;
    }
    const epochNum = typeof value === 'number' ? value : parseInt(value, 10);
    const instant = Temporal.Instant.fromEpochSeconds(epochNum);
    const timeZone = 'America/Mexico_City';
    const zonedDateTime = instant.toZonedDateTimeISO(timeZone);
    const googleSheetsDate = zonedDateTime.toPlainDateTime().toString().replace('T', ' ');
    return googleSheetsDate;
  };

  const stringParser: ParserFunction = (value: unknown, name: string): string => {
    if (typeof value === 'string') {
      return value;
    }
    throw new Error(
      `Value is not a string name: ${name} type: ${typeof value} value ${String(value)}`
    );
  };

  const personParser: ParserFunction = (value: unknown): string => {
    const carl = '8a139487-9be6-4eaf-8e4e-0c2cdb2083e3';
    const ale = '2e890e0e-42fa-4d61-9b12-e839d9bc9651';

    if (value === carl) {
      return 'Carl';
    } else if (value === ale) {
      return 'Ale';
    } else {
      return 'Unknown actor';
    }
  };

  const categoryParser: ParserFunction = (value: unknown, name: string): string => {
    const possibleValue = value as Category;

    if (possibleValue.main_description && possibleValue.sub_description) {
      return `${possibleValue.main_description} - ${possibleValue.sub_description}`;
    } else {
      return `${name}: ${String(value)} Unknown Category or invalid category`;
    }
  };

  const imageParser: ParserFunction = (value: unknown, name: string): string => {
    const possibleValue = value as { image: Image };

    if (!('image' in possibleValue) || !('original' in possibleValue.image)) {
      return `${name}: malformed image`;
    }
    if (possibleValue.image.original) {
      return possibleValue.image.original;
    } else {
      return ``;
    }
  };

  const currencyAmountParser = (value: unknown): string => {
    const amount = value as CurrencyAmount;
    return (amount.fractional / 100).toFixed(2);
  };

  const sharesParser: ParserFunction = (value: unknown, name: string): string => {
    const possibleValue = value as { share: Share }[];

    return String(
      possibleValue.map(
        share =>
          `${personParser(share.share.member_id, name)} ${currencyAmountParser(share.share.amount)}`
      )
    );
  };

  const parsers: Record<string, ParserFunction | null> = {
    id: stringParser,
    name: stringParser,
    list_id: null,
    settle_id: null,
    type: stringParser,
    payed_by_id: personParser,
    payed_by_member_instance_id: null,
    payed_on: stringParser,
    created_at: dateTimeParser,
    updated_at: dateTimeParser,
    shares: sharesParser,
    status: stringParser,
    category: categoryParser,
    source_amount: currencyAmountParser,
    amount: currencyAmountParser,
    recurring_task: null,
    image: imageParser,
    received_by_id: personParser,
    received_by_member_instance_id: personParser,
    received_on: stringParser,
    exchange_rate: stringParser,
  };

  const filteredHeaders = [
    ...headers.filter(fieldName => fieldName in parsers && parsers[fieldName] !== null),
    'url',
  ];

  const csvContent = [
    filteredHeaders.join(','), // Add header row
    ...typedTransactions.map(row =>
      filteredHeaders
        .map(fieldName => {
          const value = row[fieldName as keyof Transaction];

          if (fieldName !== 'url' && (value === null || value === undefined)) {
            return ''; // Ensure empty fields are handled
          }

          let stringValue = String(value);

          if (
            Object.prototype.hasOwnProperty.call(parsers, fieldName) &&
            isParserFunction(parsers[fieldName])
          ) {
            const parserFn = parsers[fieldName];
            stringValue = String(parserFn(value, fieldName));
          }

          if (fieldName === 'url') {
            stringValue = `https://app.splitser.com/lists/${'list_id' in row && row.list_id}/expenses/${'id' in row && row.id}`;
          }

          // Escape double quotes by replacing " with ""
          return `"${stringValue.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');
  return csvContent;
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

  const headers = result.data.reduce<string[]>((acc, value) => {
    if (value.expense) {
      acc.push(...Object.keys(value.expense));
    } else if (value.income) {
      acc.push(...Object.keys(value.income));
    }
    return acc;
  }, []);

  const filename = path.join(__dirname, 'headers.json');

  await fs.writeFile(filename, JSON.stringify([...new Set(headers)]));

  const csvData = transactionsToCsv(result.data); // Adjust according to the actual structure of ApiResponse
  await fs.writeFile('transactions.csv', csvData);

  await fs.writeFile('transactions.json', JSON.stringify(result.data, undefined, 2));

  console.log('done');
}

run().catch(error => console.error(error));
