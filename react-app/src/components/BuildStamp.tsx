/**
 * Footer strip: Costarella Innovations, LLC copyright (year auto-updates) and
 * when this build was produced, including the time-zone abbreviation
 * (injected at build time via __BUILD_TIME__ in vite.config.ts).
 */
export default function BuildStamp() {
  let built = __BUILD_TIME__;
  try {
    built = new Date(__BUILD_TIME__).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    /* keep raw ISO string */
  }
  const year = new Date().getFullYear();
  return (
    <div id="footer">
      <span id="copyright">
        &copy; {year} Costarella Innovations, LLC. All rights reserved.
      </span>
      <span id="build-time">Build: {built}</span>
    </div>
  );
}
