import type { ContentRecord } from "./cms-types";

export const TEAM_AVATARS = {
  scarf: "/images/team-avatar-scarf.png",
  beard: "/images/team-avatar-beard.png",
} as const;
export function teamAvatar(member: Pick<ContentRecord, "avatar_style">) {
  return TEAM_AVATARS[member.avatar_style === "scarf" ? "scarf" : "beard"];
}
export function teamPortrait(member: Pick<ContentRecord, "image_url" | "use_avatar" | "avatar_style">) {
  return member.use_avatar || !member.image_url ? teamAvatar(member) : member.image_url;
}
