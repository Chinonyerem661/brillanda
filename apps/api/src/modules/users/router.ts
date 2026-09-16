import { Router } from "express";
import { currentSchoolId, currentUser, requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { InviteUserBody } from "./schema";
import { inviteUser } from "./service";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("SCHOOL_ADMIN"));

usersRouter.post("/invite", async (req, res) => {
  const input = InviteUserBody.parse(req.body ?? {});
  const result = await inviteUser(currentUser(req).id, currentSchoolId(req), input);
  res.status(result.resent ? 200 : 201).json(result);
});
