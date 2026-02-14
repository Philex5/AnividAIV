import GoogleAnalytics from "./google-analytics";
import Clarity from "./clarity";
import Plausible from "./plausible";

export default function Analytics() {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <>
      <Clarity />
      <GoogleAnalytics />
      <Plausible />
    </>
  );
}
