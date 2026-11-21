export type Role = 'Staff' | 'Store Manager' | 'Central admin';

export interface CallerIdentity {
  userId: string;
  displayName: string;
  role: Role;
  storeId: string;
  storeName?: string;
  locality?: string;
}

export interface GeofenceCoordinate {
  latitude: number;
  longitude: number;
}

export interface LocationReading extends GeofenceCoordinate {
  accuracy: number; // in metres
  time: string; // ISO 8601
}

export type AttendancePhase =
  | 'not_rostered'
  | 'not_checked_in'
  | 'awaiting_manager_confirmation'
  | 'checked_in'
  | 'checked_out';

export type LocationCheckStatus =
  | 'in_range'
  | 'out_of_range'
  | 'manager_confirmed'
  | 'manager_declined';

export interface AttendanceFlag {
  code: string; // e.g. 'EARLY_CHECKIN', 'LATE_CHECKOUT', 'OUT_OF_GEOFENCE', 'NOT_ROSTERED'
  label: string;
}

export type ApprovalKind = 'shift_swap' | 'attendance_correction' | 'manual_checkin';
export type ApprovalStatus = 'pending' | 'approved' | 'declined' | 'withdrawn';

export interface TaskCategory {
  id: 'group' | 'priority' | 'role_specific' | 'manager_only';
  label: string;
  description: string;
  needs_role: boolean;
  eligible: string;
}

