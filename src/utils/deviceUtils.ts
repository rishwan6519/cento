import mongoose from 'mongoose';
import AssignDevice from '@/models/AssignDevice';

export async function isDeviceAvailable(deviceId: string, controllerId: string): Promise<boolean> {
  try {
    const assignment = await AssignDevice.findOne({
      deviceId: new mongoose.Types.ObjectId(deviceId),
      controllerId: new mongoose.Types.ObjectId(controllerId),
      status: 'active'
    });

    return !!assignment && !assignment.userId;
  } catch (error) {
    console.error("Error checking device availability:", error);
    return false;
  }
}