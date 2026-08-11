export type Role = "OWNER"|"ADMIN"|"STAFF"|"CUSTOMER";
export type Permission = "inventory:read"|"inventory:write"|"sale:create"|"sale:cancel"|"report:read"|"expense:write"|"user:manage"|"settings:manage";
const permissions: Record<Role, Permission[]> = { OWNER:["inventory:read","inventory:write","sale:create","sale:cancel","report:read","expense:write","user:manage","settings:manage"], ADMIN:["inventory:read","inventory:write","sale:create","sale:cancel","report:read","expense:write","user:manage"], STAFF:["inventory:read","sale:create"], CUSTOMER:[] };
export function can(role: Role, permission: Permission) { return permissions[role].includes(permission); }
