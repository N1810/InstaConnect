import { createInstagramCallbackHandler } from "@instaconnect/next/server";
import { getInstagramServerClient } from "@/lib/instagram";

export const GET = createInstagramCallbackHandler({
  client: getInstagramServerClient(),
  successRedirectUrl: "/dashboard?connected=1",
  errorRedirectUrl: "/dashboard/settings",
  onSuccess: async (account) => {
    console.info(`[InstaConnect] Connected Instagram account: ${account.accountId}`);
  }
});

