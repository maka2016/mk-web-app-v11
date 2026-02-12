// import { Suspense } from "react";
// // import Vip from "./components/main";
// import { getQueryString } from "@/utils";
// import Vip from "../../../vip/components/vip";

// export default async function Page({
//   searchParams
// }: {
//   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
// }) {
//   const params = await searchParams;
//   const appid = getQueryString(params.appid) || "jiantie";
//   return (
//     <Suspense>
//       <Vip appid={appid} />
//     </Suspense>
//   );
// }

import VipPage from '../vip/page';

export default VipPage;
