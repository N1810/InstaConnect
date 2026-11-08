import type { InstagramPaging, PaginatedResponse } from "../types/index.js";

export interface RawGraphPaging {
  cursors?: {
    before?: string;
    after?: string;
  };
  next?: string;
  previous?: string;
}

/**
 * Normalizes Meta Graph API `paging` metadata into a consistent `InstagramPaging` structure.
 */
export function normalizePaging(raw?: RawGraphPaging): InstagramPaging {
  const after = raw?.cursors?.after;
  const before = raw?.cursors?.before;
  const next = raw?.next;
  const previous = raw?.previous;

  return {
    cursors:
      after !== undefined || before !== undefined
        ? {
            ...(before ? { before } : {}),
            ...(after ? { after } : {})
          }
        : undefined,
    ...(next ? { next } : {}),
    ...(previous ? { previous } : {}),
    hasNextPage: Boolean(next || (after && after.length > 0)),
    hasPreviousPage: Boolean(previous || (before && before.length > 0))
  };
}

/**
 * Creates an async iterator that automatically pages through cursor-based Graph endpoints.
 */
export async function* paginateCursor<T>(
  fetchPage: (cursor?: string) => Promise<PaginatedResponse<T>>,
  options: { maxPages?: number; initialCursor?: string } = {}
): AsyncGenerator<T[], void, unknown> {
  const maxPages = options.maxPages ?? 10;
  let currentCursor = options.initialCursor;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const response = await fetchPage(currentCursor);
    yield response.data;
    pageCount += 1;

    if (!response.paging.hasNextPage || !response.paging.cursors?.after) {
      break;
    }
    currentCursor = response.paging.cursors.after;
  }
}

