import { getPermissionData } from '@mk/services';

export interface PermissionList extends ReturnType<typeof getPermissionData> {}
