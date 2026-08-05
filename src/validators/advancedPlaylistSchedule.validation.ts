import mongoose from 'mongoose';
import PlaylistConfig from '@/models/PlaylistConfig';
import Device from '@/models/Device';
import AdvancedPlaylistSchedule from '@/models/AdvancedPlaylistSchedule';

export interface ScheduleInput {
  playlistId: string;
  deviceIds: string[];
  userId?: string;
  startDate: string | Date;
  endDate: string | Date;
  startTime: string;
  endTime: string;
  priority?: number;
  isActive?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedData?: {
    playlistId: mongoose.Types.ObjectId;
    deviceIds: mongoose.Types.ObjectId[];
    userId?: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    priority: number;
    isActive: boolean;
  };
}

/**
 * Validates schedule payload, checks database existence for referenced entities,
 * enforces date/time boundary logic, and prevents duplicate identical schedules.
 */
export async function validateSchedulePayload(
  input: ScheduleInput,
  existingScheduleId?: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  // 1. Validate mandatory presence
  if (!input.playlistId) errors.push('playlistId is required.');
  if (!input.deviceIds || !Array.isArray(input.deviceIds) || input.deviceIds.length === 0) {
    errors.push('deviceIds must be a non-empty array of device ObjectIds.');
  }
  if (!input.startDate) errors.push('startDate is required.');
  if (!input.endDate) errors.push('endDate is required.');
  if (!input.startTime) errors.push('startTime is required in HH:mm format.');
  if (!input.endTime) errors.push('endTime is required in HH:mm format.');

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 2. Validate ObjectIds syntax
  if (!mongoose.Types.ObjectId.isValid(input.playlistId)) {
    errors.push(`Invalid playlistId format: ${input.playlistId}`);
  }
  if (input.userId && !mongoose.Types.ObjectId.isValid(input.userId)) {
    errors.push(`Invalid userId format: ${input.userId}`);
  }

  const uniqueDeviceIds = Array.from(new Set(input.deviceIds));
  for (const docId of uniqueDeviceIds) {
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      errors.push(`Invalid deviceId format in deviceIds array: ${docId}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 3. Validate Time Formats & Range (HH:mm)
  const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(input.startTime)) {
    errors.push('startTime must be in valid 24-hour HH:mm format (e.g. 09:00).');
  }
  if (!timeRegex.test(input.endTime)) {
    errors.push('endTime must be in valid 24-hour HH:mm format (e.g. 17:00).');
  }

  if (timeRegex.test(input.startTime) && timeRegex.test(input.endTime)) {
    if (input.startTime >= input.endTime) {
      errors.push('startTime must be strictly before endTime.');
    }
  }

  // 4. Validate & Normalize Dates
  const parsedStart = new Date(input.startDate);
  const parsedEnd = new Date(input.endDate);

  if (isNaN(parsedStart.getTime())) {
    errors.push('startDate is an invalid date.');
  }
  if (isNaN(parsedEnd.getTime())) {
    errors.push('endDate is an invalid date.');
  }

  // Normalize startDate to start of day (00:00:00.000) and endDate to end of day (23:59:59.999)
  const normalizedStartDate = new Date(parsedStart);
  if (!isNaN(normalizedStartDate.getTime())) {
    normalizedStartDate.setHours(0, 0, 0, 0);
  }

  const normalizedEndDate = new Date(parsedEnd);
  if (!isNaN(normalizedEndDate.getTime())) {
    normalizedEndDate.setHours(23, 59, 59, 999);
  }

  if (!isNaN(normalizedStartDate.getTime()) && !isNaN(normalizedEndDate.getTime())) {
    if (normalizedStartDate > normalizedEndDate) {
      errors.push('startDate must not be after endDate.');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 5. Verify Existence in MongoDB (Playlist and Devices)
  const playlistExists = await PlaylistConfig.findById(input.playlistId, '_id');
  if (!playlistExists) {
    errors.push(`Playlist not found with id: ${input.playlistId}`);
  }

  const existingDevices = await Device.find({ _id: { $in: uniqueDeviceIds } }, '_id');
  if (existingDevices.length !== uniqueDeviceIds.length) {
    errors.push(`One or more deviceIds do not exist in the database.`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const deviceObjectIds = uniqueDeviceIds.map((id) => new mongoose.Types.ObjectId(id));
  const playlistObjectId = new mongoose.Types.ObjectId(input.playlistId);

  // 6. Check for Duplicate Identical Schedules
  const duplicateQuery: any = {
    playlistId: playlistObjectId,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    startTime: input.startTime,
    endTime: input.endTime,
    deviceIds: { $in: deviceObjectIds },
  };

  if (existingScheduleId && mongoose.Types.ObjectId.isValid(existingScheduleId)) {
    duplicateQuery._id = { $ne: new mongoose.Types.ObjectId(existingScheduleId) };
  }

  const duplicate = await AdvancedPlaylistSchedule.findOne(duplicateQuery);
  if (duplicate) {
    errors.push('A duplicate identical schedule already exists for one or more specified devices during this exact date and time window.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // All checks passed; build normalized clean object
  return {
    isValid: true,
    errors: [],
    normalizedData: {
      playlistId: playlistObjectId,
      deviceIds: deviceObjectIds,
      userId: input.userId ? new mongoose.Types.ObjectId(input.userId) : undefined,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      startTime: input.startTime,
      endTime: input.endTime,
      priority: typeof input.priority === 'number' ? input.priority : 0,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    },
  };
}
