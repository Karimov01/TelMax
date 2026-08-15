export type Role = "OWNER"|"ADMIN"|"STAFF"|"CUSTOMER";
export type Permission = "inventory:read"|"inventory:write"|"inventory:receive"|"sale:create"|"sale:cancel"|"report:read"|"expense:write"|"user:manage"|"settings:manage";
const permissions: Record<Role, Permission[]> = {
 OWNER:["inventory:read","inventory:write","inventory:receive","sale:create","sale:cancel","report:read","expense:write","user:manage","settings:manage"],
 ADMIN:["inventory:read","inventory:write","inventory:receive","sale:create","sale:cancel","report:read","expense:write","user:manage"],
 STAFF:["inventory:read","inventory:receive","sale:create"],
 CUSTOMER:[]
};
export function can(role: Role, permission: Permission) { return permissions[role].includes(permission); }
