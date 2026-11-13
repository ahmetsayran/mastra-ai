import type { PrismaModelNamePascalCase } from '@onlyjs/db/types';

export enum AuditLogAction {
  CREATE = 'Create',
  UPDATE = 'Update',
  DELETE = 'Delete',
}

export const AuditLogEntity = {
  USER: 'User',
  ROLE: 'Role',
  POST: 'Post',
  POST_COMMENT: 'PostComment',
  PROJECT: 'Project',
  FILE_LIBRARY_ASSET: 'FileLibraryAsset',
  USER_ROLE: 'UserRole',
  USER_PERMISSION: 'UserPermission',
  COMPANY: 'Company',
} as const satisfies Record<string, PrismaModelNamePascalCase>;
