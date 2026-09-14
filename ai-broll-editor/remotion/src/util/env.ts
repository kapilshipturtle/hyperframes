/** True on CI runners (GitHub Actions sets CI=true). Read defensively: the bundle may not define process.env. */
export const IS_CI: boolean = (() => {
  try {
    return typeof process !== "undefined" && !!process.env && !!process.env.CI;
  } catch {
    return false;
  }
})();
