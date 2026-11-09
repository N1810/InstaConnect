import { createInstagramConnectHandler } from "@neerajkr1810/instaconnect-next/server";
import { getInstagramServerClient } from "@/lib/instagram";

export const GET = createInstagramConnectHandler({
  client: getInstagramServerClient()
});

