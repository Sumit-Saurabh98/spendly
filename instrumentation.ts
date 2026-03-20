export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🚀 Server starting: Initializing Automated Services...");
    const { initCron } = await import("./lib/cron");
    initCron();
  }
}
