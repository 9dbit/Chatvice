import { useEffect } from "react";

/** Keep merchant styling out of admin, mail, and customer widgets. */
export function useMerchantUI(surface: "dashboard" | "auth" = "dashboard") {
  useEffect(() => {
    document.body.dataset.merchantUi = surface;
    return () => { delete document.body.dataset.merchantUi; };
  }, [surface]);
}
