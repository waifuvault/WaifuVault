import process from "process";

export function isSchedulerLeader(): boolean {
    const instanceId = process.env.NODE_APP_INSTANCE;
    if (instanceId === undefined || instanceId === "") {
        return true;
    }
    return instanceId === "0";
}
