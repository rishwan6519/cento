import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import Customer from '@/models/Customer';
import DeviceAssignment from '@/models/DeviceAssignment';
import mongoose from 'mongoose';

/**
 * GET /api/reseller-device-assignment?resellerId=xxx&status=all|unassigned|assigned
 *
 * Returns all devices belonging to this reseller (via customer link),
 * enriched with their active assignment record and customer info.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const resellerId = searchParams.get('resellerId');
    const statusFilter = searchParams.get('status') || 'all';

    if (!resellerId) {
      return NextResponse.json(
        { success: false, message: 'resellerId is required' },
        { status: 400 }
      );
    }

    const resellerObjectId = new mongoose.Types.ObjectId(resellerId);

    // Get all customers of this reseller
    const customers = await Customer.find({ resellerId: resellerObjectId }, '_id organizationName contactName city');
    const customerIds = customers.map((c: any) => c._id);
    const customerMap: Record<string, any> = {};
    customers.forEach((c: any) => {
      customerMap[c._id.toString()] = {
        organizationName: c.organizationName,
        contactName: c.contactName,
        city: c.city
      };
    });

    // Get active assignments for this reseller
    const activeAssignments = await DeviceAssignment.find({
      resellerId: resellerObjectId,
      status: 'assigned'
    });

    const assignedDeviceIds = activeAssignments.map((a: any) => a.deviceId);
    const assignmentMap: Record<string, any> = {};
    activeAssignments.forEach((a: any) => {
      assignmentMap[a.deviceId.toString()] = a;
    });

    // Build device query
    const orConditions: any[] = [{ resellerId: resellerObjectId }];
    if (customerIds.length > 0) {
      orConditions.push({ customerId: { $in: customerIds } });
    }
    if (assignedDeviceIds.length > 0) {
      orConditions.push({ _id: { $in: assignedDeviceIds } });
    }

    let deviceQuery: any = { $or: orConditions };

    if (statusFilter === 'unassigned') {
      deviceQuery = { $and: [{ $or: orConditions }, { _id: { $nin: assignedDeviceIds } }] };
    } else if (statusFilter === 'assigned') {
      deviceQuery = { _id: { $in: assignedDeviceIds } };
    }

    const devices = await Device.find(deviceQuery)
      .populate('typeId', 'name imageUrl')
      .sort({ createdAt: -1 });

    // Enrich with assignment & customer data
    const enrichedDevices = devices.map((d: any) => {
      const obj = d.toObject();
      const dIdStr = obj._id.toString();
      const assignment = assignmentMap[dIdStr];
      const cidStr = assignment?.customerId?.toString() || obj.customerId?.toString();

      return {
        ...obj,
        isAssigned: !!assignment,
        assignmentId: assignment?._id || null,
        assignedAt: assignment?.assignedAt || null,
        activeCustomerId: cidStr || null,
        customerInfo: cidStr ? customerMap[cidStr] || null : null
      };
    });

    return NextResponse.json({
      success: true,
      total: enrichedDevices.length,
      devices: enrichedDevices
    });
  } catch (error: any) {
    console.error('GET /api/reseller-device-assignment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch devices', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reseller-device-assignment
 * Body: { deviceId, customerId, resellerId }
 *
 * Assigns a device to a customer and creates a DeviceAssignment record.
 * RULES:
 * 1. Device must exist
 * 2. customerId must belong to this reseller
 * 3. Device must NOT already have an active assignment to a DIFFERENT customer
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { deviceId, customerId, resellerId } = body;

    if (!deviceId || !customerId || !resellerId) {
      return NextResponse.json(
        { success: false, message: 'deviceId, customerId and resellerId are all required' },
        { status: 400 }
      );
    }

    const resellerObjectId = new mongoose.Types.ObjectId(resellerId);
    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const deviceObjectId = new mongoose.Types.ObjectId(deviceId);

    // 1. Check the device exists
    const device = await Device.findById(deviceObjectId);
    if (!device) {
      return NextResponse.json(
        { success: false, message: 'Device not found' },
        { status: 404 }
      );
    }

    // 2. Check for existing ACTIVE assignment to a DIFFERENT customer
    const existingAssignment = await DeviceAssignment.findOne({
      deviceId: deviceObjectId,
      status: 'assigned'
    });

    if (existingAssignment && existingAssignment.customerId.toString() !== customerId) {
      const existingCustomer = await Customer.findById(existingAssignment.customerId, 'organizationName contactName');
      const existingName = existingCustomer?.organizationName || existingCustomer?.contactName || 'another customer';

      return NextResponse.json(
        {
          success: false,
          message: `Device is already assigned to "${existingName}". Disconnect it first before reassigning.`,
          alreadyAssignedTo: {
            customerId: existingAssignment.customerId,
            customerName: existingName
          }
        },
        { status: 409 }
      );
    }

    // 3. Check the target customer belongs to this reseller
    const customer = await Customer.findOne({ _id: customerObjectId, resellerId: resellerObjectId });
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found or does not belong to this reseller' },
        { status: 403 }
      );
    }

    // 4. Create DeviceAssignment record
    const assignment = await DeviceAssignment.create({
      deviceId: deviceObjectId,
      resellerId: resellerObjectId,
      customerId: customerObjectId,
      status: 'assigned',
      assignedAt: new Date()
    });

    // 5. Also update the Device document for quick lookup
    const updatedDevice = await Device.findByIdAndUpdate(
      deviceObjectId,
      {
        customerId: customerObjectId,
        resellerId: resellerObjectId,
      },
      { new: true }
    ).populate('typeId', 'name imageUrl');

    console.log(`Device ${deviceId} assigned to customer ${customerId} by reseller ${resellerId}, assignmentId=${assignment._id}`);

    return NextResponse.json({
      success: true,
      message: `Device successfully assigned to ${customer.organizationName || customer.contactName}`,
      device: updatedDevice,
      assignment
    });
  } catch (error: any) {
    console.error('POST /api/reseller-device-assignment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to assign device', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reseller-device-assignment
 * Body: { deviceId, resellerId }
 *
 * Disconnects a device:
 * - Marks the DeviceAssignment record as 'disconnected' (keeps history)
 * - Sets disconnectedAt timestamp
 * - Removes customerId from the Device document
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { deviceId, resellerId } = body;

    if (!deviceId || !resellerId) {
      return NextResponse.json(
        { success: false, message: 'deviceId and resellerId are required' },
        { status: 400 }
      );
    }

    const resellerObjectId = new mongoose.Types.ObjectId(resellerId);
    const deviceObjectId = new mongoose.Types.ObjectId(deviceId);

    // Find the active assignment
    const assignment = await DeviceAssignment.findOne({
      deviceId: deviceObjectId,
      status: 'assigned'
    });

    if (!assignment) {
      // No active assignment record — still try to clear the device field
      await Device.findByIdAndUpdate(deviceObjectId, { $unset: { customerId: 1 } });
      return NextResponse.json({
        success: true,
        message: 'Device disconnected (no active assignment record found)'
      });
    }

    // Verify reseller owns this assignment
    if (assignment.resellerId.toString() !== resellerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: This assignment does not belong to your account' },
        { status: 403 }
      );
    }

    // Mark the assignment as disconnected (preserve history)
    assignment.status = 'disconnected';
    assignment.disconnectedAt = new Date();
    await assignment.save();

    // Remove customerId from Device document
    const updatedDevice = await Device.findByIdAndUpdate(
      deviceObjectId,
      { $unset: { customerId: 1 } },
      { new: true }
    );

    console.log(`Device ${deviceId} disconnected by reseller ${resellerId}, assignmentId=${assignment._id}`);

    return NextResponse.json({
      success: true,
      message: 'Device disconnected successfully. Assignment history preserved.',
      device: updatedDevice,
      assignment
    });
  } catch (error: any) {
    console.error('DELETE /api/reseller-device-assignment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to disconnect device', error: error.message },
      { status: 500 }
    );
  }
}
