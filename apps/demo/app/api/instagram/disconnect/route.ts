import { createInstagramDisconnectHandler } from "@neerajkr1810/instaconnect-next/server";
import { getInstagramServerClient } from "@/lib/instagram";

export const POST = createInstagramDisconnectHandler({
  client: getInstagramServerClient(),
  onDisconnect: async (accountId) => {
    console.info(`[InstaConnect] Disconnected Instagram account: ${accountId}`);
  }
});
