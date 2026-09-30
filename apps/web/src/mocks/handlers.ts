import { adminHandlers } from "./adminHandlers";
import { platformHandlers } from "./platformHandlers";
import { teacherHandlers } from "./teacherHandlers";

/** Every stand-in endpoint. Requests with no handler here (login, invites…) go to the real API. */
export const handlers = [...teacherHandlers, ...adminHandlers, ...platformHandlers];
