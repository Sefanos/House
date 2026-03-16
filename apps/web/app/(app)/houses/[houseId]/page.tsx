"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePresignedUploadQuery } from "@/hooks/query/usePresignedUploadQuery";
import { useBadges } from "@/hooks/spacetime/useBadges";
import { useHouseBans } from "@/hooks/spacetime/useHouseBans";
import { useHouseMembers } from "@/hooks/spacetime/useHouseMembers";
import { useHouseRoles } from "@/hooks/spacetime/useHouseRoles";
import { useHouses } from "@/hooks/spacetime/useHouses";
import { useInvites } from "@/hooks/spacetime/useInvites";
import { useCurrentUser } from "@/hooks/spacetime/useCurrentUser";
import { usePermissions } from "@/hooks/spacetime/usePermissions";
import { useUserBadges } from "@/hooks/spacetime/useUserBadges";
import { useUsers } from "@/hooks/spacetime/useUsers";
import { resolveHouseAccess } from "@/lib/houseAccess";
import { invokeBadgeReducer, invokeHouseReducer, invokeRoleReducer } from "@/lib/spacetime";

const DEFAULT_MEMBER_PERMISSIONS_PRESET = "15821824";
const DEFAULT_ADMIN_PERMISSIONS_PRESET = "66190428";

type HouseLandingPageProps = {
  params: {
    houseId: string;
  };
};

export default function HouseLandingPage({ params }: HouseLandingPageProps) {
  const router = useRouter();
  const { currentUser, isLoading: isLoadingCurrentUser, error: currentUserError } = useCurrentUser();
  const { houses, isLoading: isLoadingHouses, error: housesError } = useHouses();
  const { members, isLoading: isLoadingMembers, error: membersError } = useHouseMembers(params.houseId);
  const { bans, isLoading: isLoadingBans, error: bansError } = useHouseBans(params.houseId);
  const { users } = useUsers();
  const { invites } = useInvites(params.houseId);
  const { badges: houseBadges } = useBadges(params.houseId);
  const { userBadges } = useUserBadges();
  const {
    roles,
    memberRoles,
    isLoading: isLoadingRoles,
    error: rolesError
  } = useHouseRoles(params.houseId);
  const { hasPermission, isOwner } = usePermissions({
    houseId: params.houseId,
    userId: currentUser?.id
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isKicking, setIsKicking] = useState(false);
  const [isMutatingInvites, setIsMutatingInvites] = useState(false);
  const [isMutatingBans, setIsMutatingBans] = useState(false);
  const [isMutatingRoles, setIsMutatingRoles] = useState(false);
  const [isMutatingBadges, setIsMutatingBadges] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [kickError, setKickError] = useState<string | null>(null);
  const [banError, setBanError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const presignMutation = usePresignedUploadQuery();
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);

  const access = useMemo(() => resolveHouseAccess({ hasPermission, isOwner }), [hasPermission, isOwner]);

  const house = useMemo(
    () => houses.find((candidate) => candidate.id === params.houseId) ?? null,
    [houses, params.houseId]
  );
  const invitesSorted = useMemo(
    () => [...invites].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [invites]
  );
  const memberRows = useMemo(
    () =>
      members.map((member) => {
        const user = users.find((entry) => entry.id === member.userId);
        return {
          ...member,
          username: user?.username ?? member.userId,
          displayName: user?.displayName ?? user?.username ?? member.userId
        };
      }),
    [members, users]
  );
  const banRows = useMemo(
    () =>
      bans.map((ban) => {
        const bannedUser = users.find((entry) => entry.id === ban.userId);
        const actor = users.find((entry) => entry.id === ban.bannedBy);
        return {
          ...ban,
          bannedDisplayName: bannedUser?.displayName ?? bannedUser?.username ?? ban.userId,
          actorDisplayName: actor?.displayName ?? actor?.username ?? ban.bannedBy
        };
      }),
    [bans, users]
  );

  const memberRoleMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const memberRole of memberRoles) {
      const current = map.get(memberRole.userId) ?? [];
      current.push(memberRole.roleId);
      map.set(memberRole.userId, current);
    }
    return map;
  }, [memberRoles]);

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const role of roles) {
      map.set(role.id, role.name);
    }
    return map;
  }, [roles]);

  const badgeById = useMemo(() => {
    const map = new Map<string, (typeof houseBadges)[number]>();
    for (const badge of houseBadges) {
      map.set(badge.id, badge);
    }
    return map;
  }, [houseBadges]);

  const memberBadgeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const assignment of userBadges) {
      if (assignment.houseId !== params.houseId) continue;
      const badge = badgeById.get(assignment.badgeId);
      if (!badge) continue;
      const labels = map.get(assignment.userId) ?? [];
      labels.push(badge.name);
      map.set(assignment.userId, labels);
    }
    return map;
  }, [badgeById, params.houseId, userBadges]);

  useEffect(() => {
    if (house?.iconUrl) {
      setIconPreviewUrl(house.iconUrl);
    }
  }, [house?.iconUrl]);

  async function onUpdateHouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    let iconUrl = String(formData.get("iconUrl") ?? "");
    const isPublic = formData.get("isPublic") === "on";
    const themeId = String(formData.get("themeId") ?? "");
    const accentColor = String(formData.get("accentColor") ?? "");

    setIsUpdating(true);
    setUpdateError(null);
    setStatusMessage(null);
    try {
      if (iconFile) {
        const { uploadUrl, publicUrl } = await presignMutation.mutateAsync({
          fileName: iconFile.name,
          contentType: iconFile.type,
          sizeBytes: iconFile.size
        });
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: iconFile,
          headers: { "Content-Type": iconFile.type }
        });
        if (!uploadResponse.ok) throw new Error("Failed to upload house icon.");
        if (publicUrl) iconUrl = publicUrl;
      }

      await invokeHouseReducer("house.updateHouse", {
        houseId: house.id,
        name,
        description,
        iconUrl,
        isPublic,
        themeId,
        accentColor
      });
      setStatusMessage("House updated.");
      setIconFile(null); // Keep preview URL but clear file state
    } catch (nextError) {
      setUpdateError(nextError instanceof Error ? nextError.message : "Failed to update house.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function onGrantBadge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("userId") ?? "");
    const badgeName = String(formData.get("badgeName") ?? "");
    const badgeIcon = String(formData.get("badgeIcon") ?? "");
    const badgeType = String(formData.get("badgeType") ?? "house");

    setIsMutatingBadges(true);
    setBadgeError(null);
    setStatusMessage(null);
    try {
      await invokeBadgeReducer("badges.grantBadge", {
        houseId: house.id,
        userId,
        badgeName,
        badgeIcon,
        badgeType: badgeType === "earned" || badgeType === "achievement" ? badgeType : "house"
      });
      setStatusMessage("Badge granted.");
      form.reset();
    } catch (nextError) {
      setBadgeError(nextError instanceof Error ? nextError.message : "Failed to grant badge.");
    } finally {
      setIsMutatingBadges(false);
    }
  }

  async function onRevokeBadge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("userId") ?? "");
    const badgeId = String(formData.get("badgeId") ?? "");

    setIsMutatingBadges(true);
    setBadgeError(null);
    setStatusMessage(null);
    try {
      await invokeBadgeReducer("badges.revokeBadge", {
        houseId: house.id,
        userId,
        badgeId
      });
      setStatusMessage("Badge revoked.");
      form.reset();
    } catch (nextError) {
      setBadgeError(nextError instanceof Error ? nextError.message : "Failed to revoke badge.");
    } finally {
      setIsMutatingBadges(false);
    }
  }

  async function onDeleteHouse() {
    if (!house) return;
    setIsDeleting(true);
    setDeleteError(null);
    setStatusMessage(null);
    try {
      await invokeHouseReducer("house.deleteHouse", { houseId: house.id });
      router.replace("/houses");
    } catch (nextError) {
      setDeleteError(nextError instanceof Error ? nextError.message : "Failed to delete house.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function onCreateInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const maxUsesValue = String(formData.get("maxUses") ?? "").trim();
    const expiresInHoursValue = String(formData.get("expiresInHours") ?? "").trim();

    setIsMutatingInvites(true);
    setInviteError(null);
    setStatusMessage(null);
    try {
      await invokeHouseReducer("house.createInvite", {
        houseId: house.id,
        maxUses: maxUsesValue ? Number(maxUsesValue) : undefined,
        expiresInHours: expiresInHoursValue ? Number(expiresInHoursValue) : undefined
      });
      setStatusMessage("Invite created.");
      form.reset();
    } catch (nextError) {
      setInviteError(nextError instanceof Error ? nextError.message : "Failed to create invite.");
    } finally {
      setIsMutatingInvites(false);
    }
  }

  async function onRevokeInvite(code: string) {
    if (!house) return;

    setIsMutatingInvites(true);
    setInviteError(null);
    setStatusMessage(null);
    try {
      await invokeHouseReducer("house.revokeInvite", {
        houseId: house.id,
        code
      });
      setStatusMessage(`Invite ${code} revoked.`);
    } catch (nextError) {
      setInviteError(nextError instanceof Error ? nextError.message : "Failed to revoke invite.");
    } finally {
      setIsMutatingInvites(false);
    }
  }

  async function onKickMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("memberUserId") ?? "");
    if (!userId) return;

    setIsKicking(true);
    setKickError(null);
    setStatusMessage(null);
    try {
      await invokeHouseReducer("house.kickMember", {
        houseId: house.id,
        userId
      });
      setStatusMessage("Member removed.");
      form.reset();
    } catch (nextError) {
      setKickError(nextError instanceof Error ? nextError.message : "Failed to remove member.");
    } finally {
      setIsKicking(false);
    }
  }

  async function onBanMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("banUserId") ?? "");
    const reason = String(formData.get("banReason") ?? "");
    if (!userId) return;

    setIsMutatingBans(true);
    setBanError(null);
    setStatusMessage(null);
    try {
      await invokeHouseReducer("house.banMember", {
        houseId: house.id,
        userId,
        reason
      });
      setStatusMessage("Member banned.");
      form.reset();
    } catch (nextError) {
      setBanError(nextError instanceof Error ? nextError.message : "Failed to ban member.");
    } finally {
      setIsMutatingBans(false);
    }
  }

  async function onUnbanMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("unbanUserId") ?? "");
    if (!userId) return;

    setIsMutatingBans(true);
    setBanError(null);
    setStatusMessage(null);
    try {
      await invokeHouseReducer("house.unbanMember", {
        houseId: house.id,
        userId
      });
      setStatusMessage("Member unbanned.");
      form.reset();
    } catch (nextError) {
      setBanError(nextError instanceof Error ? nextError.message : "Failed to unban member.");
    } finally {
      setIsMutatingBans(false);
    }
  }

  async function onCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("roleName") ?? "");
    const color = String(formData.get("roleColor") ?? "");
    const permissions = String(formData.get("rolePermissions") ?? "0");
    const positionValue = String(formData.get("rolePosition") ?? "");

    setIsMutatingRoles(true);
    setRoleError(null);
    setStatusMessage(null);
    try {
      await invokeRoleReducer("roles.createRole", {
        houseId: house.id,
        name,
        color,
        permissions,
        position: positionValue ? Number(positionValue) : undefined
      });
      setStatusMessage("Role created.");
      form.reset();
    } catch (nextError) {
      setRoleError(nextError instanceof Error ? nextError.message : "Failed to create role.");
    } finally {
      setIsMutatingRoles(false);
    }
  }

  async function onUpdateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const roleId = String(formData.get("roleId") ?? "");
    const name = String(formData.get("name") ?? "");
    const color = String(formData.get("color") ?? "");
    const permissions = String(formData.get("permissions") ?? "0");
    const position = Number(formData.get("position") ?? 0);

    setIsMutatingRoles(true);
    setRoleError(null);
    setStatusMessage(null);
    try {
      await invokeRoleReducer("roles.updateRole", {
        roleId,
        name,
        color,
        permissions,
        position
      });
      setStatusMessage("Role updated.");
    } catch (nextError) {
      setRoleError(nextError instanceof Error ? nextError.message : "Failed to update role.");
    } finally {
      setIsMutatingRoles(false);
    }
  }

  async function onDeleteRole(roleId: string) {
    setIsMutatingRoles(true);
    setRoleError(null);
    setStatusMessage(null);
    try {
      await invokeRoleReducer("roles.deleteRole", { roleId });
      setStatusMessage("Role deleted.");
    } catch (nextError) {
      setRoleError(nextError instanceof Error ? nextError.message : "Failed to delete role.");
    } finally {
      setIsMutatingRoles(false);
    }
  }

  async function onAssignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("assignUserId") ?? "");
    const roleId = String(formData.get("assignRoleId") ?? "");

    setIsMutatingRoles(true);
    setRoleError(null);
    setStatusMessage(null);
    try {
      await invokeRoleReducer("roles.assignRole", {
        houseId: house.id,
        userId,
        roleId
      });
      setStatusMessage("Role assigned.");
      form.reset();
    } catch (nextError) {
      setRoleError(nextError instanceof Error ? nextError.message : "Failed to assign role.");
    } finally {
      setIsMutatingRoles(false);
    }
  }

  async function onRevokeRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("revokeUserId") ?? "");
    const roleId = String(formData.get("revokeRoleId") ?? "");

    setIsMutatingRoles(true);
    setRoleError(null);
    setStatusMessage(null);
    try {
      await invokeRoleReducer("roles.revokeRole", {
        houseId: house.id,
        userId,
        roleId
      });
      setStatusMessage("Role revoked.");
      form.reset();
    } catch (nextError) {
      setRoleError(nextError instanceof Error ? nextError.message : "Failed to revoke role.");
    } finally {
      setIsMutatingRoles(false);
    }
  }

  if (isLoadingHouses || isLoadingMembers || isLoadingBans || isLoadingRoles || isLoadingCurrentUser) {
    return (
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Loading house...</h3>
        <p className="text-sm text-slate-300">Fetching house, member, moderation, and role data.</p>
      </section>
    );
  }

  if (housesError || membersError || bansError || rolesError || currentUserError) {
    return (
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Failed to load house</h3>
        <p className="text-sm text-rose-400">
          {housesError ?? membersError ?? bansError ?? rolesError ?? currentUserError}
        </p>
      </section>
    );
  }

  if (!house) {
    return (
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">House not found</h3>
        <p className="text-sm text-slate-300">No house exists with id {params.houseId}.</p>
      </section>
    );
  }

  const showInviteSection = access.canManageInvites;
  const showRolesSection = access.canManageRoles;
  const showModerationSection = access.canManageRoles || access.canKickMembers || access.canBanMembers;
  const showDangerZone = access.canDeleteHouse;

  if (!access.canOpenHouseSettings) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h3 className="text-xl font-semibold">{house.name}</h3>
          <p className="text-sm text-slate-300">{house.description || "No description."}</p>
        </header>

        <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
          <h4 className="text-sm font-semibold text-amber-100">House settings are restricted</h4>
          <p className="mt-1 text-sm text-amber-200/90">
            Only the house owner and members who can manage rooms can open this settings view.
          </p>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Members</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{memberRows.length}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Roles</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{roles.length}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Invites</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{invitesSorted.length}</p>
          </article>
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold">{house.name}</h3>
        <p className="text-sm text-slate-300">{house.description || "No description."}</p>
      </header>

      {statusMessage ? (
        <p className="rounded-md border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {statusMessage}
        </p>
      ) : null}

      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Quick Path</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-100">1. Create Rooms</h4>
          <p className="mt-1 text-xs text-slate-400">Use the left sidebar button “Create Room”.</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Quick Path</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-100">2. Invite Members</h4>
          <p className="mt-1 text-xs text-slate-400">Use the invite section below to generate codes.</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Advanced</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-100">Roles & Moderation</h4>
          <p className="mt-1 text-xs text-slate-400">Collapsed below to keep the page easier to scan.</p>
        </article>
      </section>

      <nav className="flex flex-wrap gap-2">
        <a
          href="#house-settings"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          House Settings
        </a>
        {showInviteSection ? (
          <a
            href="#invite-members"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            Invite Members
          </a>
        ) : null}
        {showRolesSection ? (
          <a
            href="#advanced-controls"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            Advanced Controls
          </a>
        ) : null}
      </nav>

      <div className={`grid gap-4 ${showInviteSection ? "lg:grid-cols-2" : ""}`}>
        <form
          id="house-settings"
          onSubmit={onUpdateHouse}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <h4 className="text-sm font-semibold tracking-wide text-slate-200">House Settings</h4>
          <p className="text-xs text-slate-400">Basic house details and appearance.</p>
          <div className="space-y-1">
            <label htmlFor="name" className="text-xs uppercase tracking-wide text-slate-400">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={60}
              defaultValue={house.name}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="description" className="text-xs uppercase tracking-wide text-slate-400">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={280}
              defaultValue={house.description}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Icon</span>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingIcon(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingIcon(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingIcon(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  setIconFile(file);
                  setIconPreviewUrl(URL.createObjectURL(file));
                }
              }}
              className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-6 transition-colors ${
                isDraggingIcon 
                  ? "border-sky-500 bg-sky-500/10" 
                  : "border-slate-700 bg-slate-950/50 hover:bg-slate-900"
              }`}
            >
              <input 
                type="hidden" 
                name="iconUrl"
                value={house.iconUrl || ""}
              />
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    setIconFile(file);
                    setIconPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              {iconPreviewUrl ? (
                <div className="flex flex-col items-center gap-3 relative z-20">
                  <img src={iconPreviewUrl} alt="House Icon Preview" className="h-16 w-16 rounded-2xl object-cover" />
                  <span className="text-xs text-sky-400">Change icon</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 relative z-20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-xs font-medium">Click or drag image here</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="themeId" className="text-xs uppercase tracking-wide text-slate-400">
              House Theme
            </label>
            <select
              id="themeId"
              name="themeId"
              defaultValue={house.themeId || "default"}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="default">Default</option>
              <option value="ocean">Ocean</option>
              <option value="forest">Forest</option>
              <option value="ember">Ember</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="accentColor" className="text-xs uppercase tracking-wide text-slate-400">
              Accent Color
            </label>
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={house.accentColor || "#38bdf8"}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={house.isPublic}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950"
            />
            Discoverable
          </label>
          <button
            type="submit"
            disabled={isUpdating}
            className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUpdating ? "Saving..." : "Save House"}
          </button>
          {updateError ? <p className="text-sm text-rose-400">{updateError}</p> : null}
        </form>

        {showInviteSection ? (
          <section id="invite-members" className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-sm font-semibold tracking-wide text-slate-200">Invite Members</h4>
            <p className="text-xs text-slate-400">Create one-time or reusable invite codes.</p>
            <form onSubmit={onCreateInvite} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                name="maxUses"
                type="number"
                min={1}
                max={1000}
                placeholder="Max uses (optional)"
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="expiresInHours"
                type="number"
                min={0}
                max={720}
                placeholder="Expires in hours (optional)"
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="submit"
                disabled={isMutatingInvites}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isMutatingInvites ? "Working..." : "Create Invite"}
              </button>
            </form>
            {invitesSorted.length === 0 ? (
              <p className="text-sm text-slate-300">No invites available.</p>
            ) : (
              <ul className="space-y-2">
                {invitesSorted.map((invite) => (
                  <li key={invite.code} className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-100">{invite.code}</p>
                      <button
                        type="button"
                        onClick={() => onRevokeInvite(invite.code)}
                        disabled={isMutatingInvites}
                        className="rounded-md border border-rose-800/70 px-2 py-1 text-xs text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Revoke
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Uses: {invite.uses}
                      {typeof invite.maxUses === "number" ? ` / ${invite.maxUses}` : " / unlimited"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Expires: {invite.expiresAt ? invite.expiresAt : "never"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {inviteError ? <p className="text-sm text-rose-400">{inviteError}</p> : null}
          </section>
        ) : null}
      </div>

      {showRolesSection ? (
      <details id="advanced-controls" className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold tracking-wide text-slate-200">
          Advanced: Roles & Permissions
        </summary>
        <p className="pt-1 text-xs text-slate-400">Use this only if you need custom permissions and role hierarchy.</p>

        <form onSubmit={onCreateRole} className="grid gap-2 md:grid-cols-2">
          <input
            name="roleName"
            required
            placeholder="Role name"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="roleColor"
            placeholder="Color (optional)"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="rolePosition"
            type="number"
            min={0}
            placeholder="Position (optional)"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="rolePermissions"
            required
            defaultValue={DEFAULT_MEMBER_PERMISSIONS_PRESET}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(event) => {
                const form = (event.currentTarget.closest("form") as HTMLFormElement) || null;
                if (!form) return;
                const input = form.elements.namedItem("rolePermissions") as HTMLInputElement | null;
                if (input) input.value = DEFAULT_MEMBER_PERMISSIONS_PRESET;
              }}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              Use Member Preset
            </button>
            <button
              type="button"
              onClick={(event) => {
                const form = (event.currentTarget.closest("form") as HTMLFormElement) || null;
                if (!form) return;
                const input = form.elements.namedItem("rolePermissions") as HTMLInputElement | null;
                if (input) input.value = DEFAULT_ADMIN_PERMISSIONS_PRESET;
              }}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              Use Admin Preset
            </button>
            <button
              type="submit"
              disabled={isMutatingRoles}
              className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isMutatingRoles ? "Working..." : "Create Role"}
            </button>
          </div>
        </form>

        <ul className="space-y-3">
          {roles.map((role) => (
            <li key={role.id} className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
              <form onSubmit={onUpdateRole} className="grid gap-2 md:grid-cols-2">
                <input type="hidden" name="roleId" value={role.id} />
                <input
                  name="name"
                  required
                  defaultValue={role.name}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="color"
                  defaultValue={role.color}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="position"
                  type="number"
                  min={0}
                  defaultValue={role.position}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="permissions"
                  defaultValue={role.permissions}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {role.isDefault ? "Default role" : "Custom role"} · permissions {role.permissions}
                  </span>
                  <button
                    type="submit"
                    disabled={isMutatingRoles}
                    className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Save Role
                  </button>
                  {!role.isDefault ? (
                    <button
                      type="button"
                      onClick={() => onDeleteRole(role.id)}
                      disabled={isMutatingRoles}
                      className="rounded-md border border-rose-800/70 px-3 py-1 text-xs text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Delete Role
                    </button>
                  ) : null}
                </div>
              </form>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 md:grid-cols-2">
          <form onSubmit={onAssignRole} className="space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Assign Role</p>
            <select
              name="assignUserId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                Select member
              </option>
              {memberRows.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
            <select
              name="assignRoleId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                Select role
              </option>
              {roles.filter((role) => !role.isDefault).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isMutatingRoles}
              className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Assign
            </button>
          </form>

          <form onSubmit={onRevokeRole} className="space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Revoke Role</p>
            <select
              name="revokeUserId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                Select member
              </option>
              {memberRows.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
            <select
              name="revokeRoleId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                Select role
              </option>
              {roles.filter((role) => !role.isDefault).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isMutatingRoles}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Revoke
            </button>
          </form>
        </div>

        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Member Role Summary</p>
          <ul className="space-y-1">
            {memberRows.map((member) => {
              const assigned = memberRoleMap.get(member.userId) ?? [];
              const labels = assigned.map((roleId) => roleNameById.get(roleId) ?? roleId);
              return (
                <li key={member.id} className="text-xs text-slate-300">
                  {member.displayName}: {labels.length ? labels.join(", ") : "No custom roles"}
                </li>
              );
            })}
          </ul>
        </div>

        {roleError ? <p className="text-sm text-rose-400">{roleError}</p> : null}
      </details>
      ) : null}

      {showModerationSection ? (
      <details className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold tracking-wide text-slate-200">
          Advanced: Members, Badges & Moderation
        </summary>
        <p className="pt-1 text-xs text-slate-400">Manage member badges, kicks, bans, and moderation logs.</p>
        {memberRows.length === 0 ? <p className="text-sm text-slate-300">No members found.</p> : null}
        <ul className="space-y-2">
          {memberRows.map((member) => (
            <li key={member.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-100">{member.displayName}</p>
                <p className="text-xs text-slate-400">@{member.username}</p>
                <p className="text-xs text-slate-500">
                  Badges: {(memberBadgeMap.get(member.userId) ?? []).join(", ") || "none"}
                </p>
              </div>
              <p className="text-xs text-slate-500">joined {member.joinedAt}</p>
            </li>
          ))}
        </ul>

        {access.canManageRoles ? (
          <>
            <div className="grid gap-2 md:grid-cols-2">
              <form onSubmit={onGrantBadge} className="space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Grant Badge</p>
                <select
                  name="userId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="" disabled>
                    Select member
                  </option>
                  {memberRows.map((member) => (
                    <option key={member.id} value={member.userId}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
                <input
                  name="badgeName"
                  required
                  maxLength={40}
                  placeholder="Badge name"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="badgeIcon"
                  maxLength={256}
                  placeholder="Badge icon (emoji or URL)"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <select
                  name="badgeType"
                  defaultValue="house"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="house">House</option>
                  <option value="earned">Earned</option>
                  <option value="achievement">Achievement</option>
                </select>
                <button
                  type="submit"
                  disabled={isMutatingBadges}
                  className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isMutatingBadges ? "Working..." : "Grant Badge"}
                </button>
              </form>

              <form onSubmit={onRevokeBadge} className="space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Revoke Badge</p>
                <select
                  name="userId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="" disabled>
                    Select member
                  </option>
                  {memberRows.map((member) => (
                    <option key={member.id} value={member.userId}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
                <select
                  name="badgeId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="" disabled>
                    Select badge
                  </option>
                  {houseBadges.map((badge) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isMutatingBadges}
                  className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isMutatingBadges ? "Working..." : "Revoke Badge"}
                </button>
              </form>
            </div>
            {badgeError ? <p className="text-sm text-rose-400">{badgeError}</p> : null}
          </>
        ) : null}

        {access.canKickMembers ? (
        <form onSubmit={onKickMember} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <label htmlFor="memberUserId" className="text-xs uppercase tracking-wide text-slate-400">
              Remove Member
            </label>
            <select
              id="memberUserId"
              name="memberUserId"
              defaultValue=""
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                Select member
              </option>
              {memberRows.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isKicking}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isKicking ? "Removing..." : "Kick Member"}
          </button>
        </form>
        ) : null}
        {access.canKickMembers && kickError ? <p className="text-sm text-rose-400">{kickError}</p> : null}

        {access.canBanMembers ? (
        <form onSubmit={onBanMember} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-1">
            <label htmlFor="banUserId" className="text-xs uppercase tracking-wide text-slate-400">
              Ban Member
            </label>
            <select
              id="banUserId"
              name="banUserId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                Select member
              </option>
              {memberRows.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="banReason" className="text-xs uppercase tracking-wide text-slate-400">
              Reason (optional)
            </label>
            <input
              id="banReason"
              name="banReason"
              maxLength={280}
              placeholder="Reason for moderation log"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={isMutatingBans}
            className="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isMutatingBans ? "Working..." : "Ban Member"}
          </button>
        </form>
        ) : null}

        {access.canBanMembers ? (
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Banned Members</p>
          {banRows.length === 0 ? <p className="text-sm text-slate-300">No banned members.</p> : null}
          {banRows.length > 0 ? (
            <ul className="space-y-2">
              {banRows.map((ban) => (
                <li key={ban.id} className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{ban.bannedDisplayName}</p>
                      <p className="text-xs text-slate-400">
                        by {ban.actorDisplayName} · {ban.bannedAt}
                      </p>
                      <p className="text-xs text-slate-500">{ban.reason || "No reason provided."}</p>
                    </div>
                    <form onSubmit={onUnbanMember}>
                      <input type="hidden" name="unbanUserId" value={ban.userId} />
                      <button
                        type="submit"
                        disabled={isMutatingBans}
                        className="rounded-md border border-emerald-700 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-900/30 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Unban
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        ) : null}
        {access.canBanMembers && banError ? <p className="text-sm text-rose-400">{banError}</p> : null}
      </details>
      ) : null}

      {showDangerZone ? (
      <details className="space-y-2 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4">
        <summary className="cursor-pointer text-sm font-semibold tracking-wide text-rose-200">
          Danger Zone
        </summary>
        <p className="pt-1 text-xs text-rose-300">Permanently deletes this house and all related data.</p>
        <button
          type="button"
          onClick={onDeleteHouse}
          disabled={isDeleting}
          className="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDeleting ? "Deleting..." : "Delete House"}
        </button>
        {deleteError ? <p className="text-sm text-rose-300">{deleteError}</p> : null}
      </details>
      ) : null}
    </section>
  );
}
