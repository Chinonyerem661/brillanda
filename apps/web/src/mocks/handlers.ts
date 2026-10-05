import { adminHandlers } from "./adminHandlers";
import { parentHandlers } from "./parentHandlers";
import { platformHandlers } from "./platformHandlers";
import { setupHandlers } from "./setupHandlers";
import { teacherHandlers } from "./teacherHandlers";

/**
 * Every stand-in endpoint. Requests with no handler here (login, invites…) go to the real API.
 * Setup comes first: its score save answers school admins and leaves teachers' saves to the next.
 */
export const handlers = [...setupHandlers, ...teacherHandlers, ...adminHandlers, ...parentHandlers, ...platformHandlers];
