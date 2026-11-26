export type RolePermissionChanges = Record<string, Record<string, boolean>>;

export type RolePermissionRole = "admin" | "buyer" | "coordinator" | "finance" | "viewer";

export type RolePermissionUpsert = {
  role: RolePermissionRole;
  permission_id: string;
};

export type RolePermissionRemoval = {
  role: RolePermissionRole;
  permissionIds: string[];
};

/**
 * Converte o estado de alteracoes da matriz em dois grupos de escrita:
 * um upsert unico e um delete por role. Evita uma requisicao por celula.
 */
export function summarizePermissionChanges(changes: RolePermissionChanges): {
  upserts: RolePermissionUpsert[];
  removals: RolePermissionRemoval[];
} {
  const upserts: RolePermissionUpsert[] = [];
  const removals: RolePermissionRemoval[] = [];

  for (const [roleKey, perms] of Object.entries(changes)) {
    const role = roleKey as RolePermissionRole;
    const habilitados: string[] = [];
    const desabilitados: string[] = [];

    for (const [permissionId, enabled] of Object.entries(perms)) {
      if (enabled) habilitados.push(permissionId);
      else desabilitados.push(permissionId);
    }

    for (const permissionId of habilitados) {
      upserts.push({ role, permission_id: permissionId });
    }
    if (desabilitados.length > 0) {
      removals.push({ role, permissionIds: desabilitados });
    }
  }

  return { upserts, removals };
}
