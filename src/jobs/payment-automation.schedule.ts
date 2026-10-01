import cron from "node-cron";
import { getDatabase } from "../database.js";
import { runPaymentAutomation } from "./payment-automation.job.js";

const DAILY_AT = "5 0 * * *";


async function run(trigger: "boot" | "daily") {
    try {
        const report = await runPaymentAutomation(getDatabase());
        console.info(
            `[payments:auto] ${trigger} run — periods=${report.periods.join(",")} created=${report.created} ` +
                `duplicates=${report.duplicatesSkipped} overdue=${report.markedOverdue} errors=${report.errors.length}`
        );
    } catch (error) {
        console.error(`[payments:auto] ${trigger} run failed:`, error);
    }
}

export function startPaymentAutomation(): () => void {
    const task = cron.schedule(DAILY_AT, () => run("daily"), { timezone: "UTC", noOverlap: true });
    void run("boot");
    return () => {
        void task.stop();
    };
}
