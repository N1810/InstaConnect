import { InstagramApiError, InstagramAuthError, InstagramValidationError } from "../errors/index.js";
import type { InstagramHttpClient } from "../http/index.js";
import type { InstagramInsightMetric, InstagramInsightPeriod } from "../types/index.js";
import { assertValidGraphId } from "../utils/index.js";

const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

export const SUPPORTED_MEDIA_METRICS = [
  "impressions",
  "reach",
  "saved",
  "likes",
  "comments",
  "shares",
  "plays",
  "total_interactions"
] as const;

export const SUPPORTED_ACCOUNT_METRICS = [
  "impressions",
  "reach",
  "profile_views",
  "accounts_engaged",
  "total_interactions",
  "follower_count"
] as const;

interface RawInsightsResponse {
  data?: Array<{
    name: string;
    period: InstagramInsightPeriod;
    title?: string;
    description?: string;
    id: string;
    values?: Array<{
      value: number | Record<string, number>;
      end_time?: string;
    }>;
    total_value?: {
      value?: number;
    };
  }>;
}

/**
 * Separate Insights module for Instagram Professional (Business & Creator) accounts.
 * Requires `instagram_business_manage_insights` permission.
 */
export class InstagramInsightsApi {
  private readonly http: InstagramHttpClient;
  private readonly apiVersion: string;
  private readonly resolveToken: (options?: {
    accountId?: string;
    accessToken?: string;
  }) => Promise<string>;

  constructor(options: {
    http: InstagramHttpClient;
    apiVersion: string;
    resolveToken: (options?: { accountId?: string; accessToken?: string }) => Promise<string>;
  }) {
    this.http = options.http;
    this.apiVersion = options.apiVersion;
    this.resolveToken = options.resolveToken;
  }

  /**
   * Fetches insights for a specific Instagram media item.
   * Gracefully handles unsupported metrics or permission restrictions.
   */
  public async getMediaInsights(
    mediaId: string,
    options: {
      metrics?: string[];
      accountId?: string;
      accessToken?: string;
    } = {}
  ): Promise<InstagramInsightMetric[]> {
    const safeMediaId = assertValidGraphId(mediaId, "mediaId");
    const metrics =
      options.metrics && options.metrics.length > 0
        ? options.metrics
        : ["impressions", "reach", "saved", "total_interactions"];

    for (const metric of metrics) {
      if (!/^[a-z0-9_]+$/i.test(metric)) {
        throw new InstagramValidationError(`Invalid insight metric name: "${metric}"`, {
          field: "metrics"
        });
      }
    }

    const token = await this.resolveToken(options);

    try {
      const response = await this.http.request<RawInsightsResponse>(
        `${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/${safeMediaId}/insights`,
        {
          method: "GET",
          query: {
            metric: metrics.join(","),
            access_token: token
          }
        }
      );

      return this.normalizeInsights(response);
    } catch (error) {
      if (error instanceof InstagramAuthError || error instanceof InstagramApiError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Fetches account-level insights for the authorized Instagram Professional account.
   */
  public async getAccountInsights(options: {
    metrics?: string[];
    period?: InstagramInsightPeriod;
    since?: number;
    until?: number;
    accountId?: string;
    accessToken?: string;
  } = {}): Promise<InstagramInsightMetric[]> {
    const metrics =
      options.metrics && options.metrics.length > 0
        ? options.metrics
        : ["impressions", "reach", "profile_views"];
    const period = options.period ?? "day";

    const token = await this.resolveToken(options);

    const response = await this.http.request<RawInsightsResponse>(
      `${INSTAGRAM_GRAPH_BASE_URL}/${this.apiVersion}/me/insights`,
      {
        method: "GET",
        query: {
          metric: metrics.join(","),
          period,
          since: options.since,
          until: options.until,
          access_token: token
        }
      }
    );

    return this.normalizeInsights(response);
  }

  private normalizeInsights(raw: RawInsightsResponse): InstagramInsightMetric[] {
    return (raw.data ?? []).map((item) => ({
      name: item.name,
      period: item.period,
      ...(item.title ? { title: item.title } : {}),
      ...(item.description ? { description: item.description } : {}),
      id: item.id,
      values: (item.values ?? []).map((v) => ({
        value: v.value,
        ...(v.end_time ? { endTime: v.end_time } : {})
      })),
      ...(typeof item.total_value?.value === "number"
        ? { totalValue: item.total_value.value }
        : {})
    }));
  }
}

