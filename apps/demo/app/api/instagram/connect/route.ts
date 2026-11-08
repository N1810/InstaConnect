import { createInstagramConnectHandler } from "@instaconnect/next/server";
import { getInstagramServerClient } from "@/lib/instagram";

export const GET = createInstagramConnectHandler({
  client: getInstagramServerClient()
});

