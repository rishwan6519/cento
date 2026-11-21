import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import StoreConfig from '@/models/StoreConfig';
import ApprovalRequest from '@/models/ApprovalRequest';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { calculateDistanceMetres } from '@/lib/storesparc/geo';
import { apiError, conflictError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();

      const {
        store_id,
        client_timestamp,
        location_reading,
        manual_confirmation_requested = false,
      } = body;

      const storeId = store_id || caller!.storeId;
      const clientDate = client_timestamp ? new Date(client_timestamp) : new Date();
      const todayStr = clientDate.toISOString().split('T')[0];

      // Fetch store config for geofence
      let storeConfig = await StoreConfig.findOne({ storeId });
      if (!storeConfig) {
        storeConfig = await StoreConfig.create({
          storeId,
          storeName: caller!.storeName || 'Sparc Store',
          latitude: 12.9716,
          longitude: 77.5946,
          geofenceRadius: 150,
        });
      }

      // Check existing attendance today
      let attendance = await AttendanceRecord.findOne({
        userId: caller!.userId,
        date: todayStr,
      });

      if (attendance && attendance.phase === 'checked_in') {
        return conflictError('ALREADY_CHECKED_IN', 'You are already checked in for today');
      }

      const flags: { code: string; label: string }[] = [];
      let verdict = 'accepted';
      let phase: any = 'checked_in';
      let locationCheck: any = 'in_range';
      let message = 'Check-in recorded successfully';
      let approvalRequestId: string | undefined;

      if (location_reading && location_reading.latitude && location_reading.longitude) {
        const distance = calculateDistanceMetres(
          location_reading.latitude,
          location_reading.longitude,
          storeConfig.latitude,
          storeConfig.longitude
        );

        if (distance > storeConfig.geofenceRadius) {
          locationCheck = 'out_of_range';
          flags.push({
            code: 'OUT_OF_GEOFENCE',
            label: `Distance ${distance}m exceeds store radius (${storeConfig.geofenceRadius}m)`,
          });

          if (manual_confirmation_requested) {
            verdict = 'awaiting_manager_confirmation';
            phase = 'awaiting_manager_confirmation';
            message = 'Outside store geofence. Sent to Store Manager for confirmation.';

            const approval = await ApprovalRequest.create({
              storeId,
              kind: 'manual_checkin',
              requesterId: caller!.userId,
              requesterName: caller!.displayName,
              summary: `${caller!.displayName} manual check-in request`,
              detail: {
                client_timestamp: clientDate.toISOString(),
                distance,
                location_reading,
              },
              status: 'pending',
              complianceFlag: {
                flagged: true,
                reason: `Check-in location ${distance}m outside geofence`,
              },
              declineReasons: [
                'Not on store premises',
                'Unscheduled shift',
                'Inaccurate location reading',
              ],
            });
            approvalRequestId = approval._id.toString();
          } else {
            verdict = 'outside_geofence';
            phase = 'not_checked_in';
            message = 'Check-in rejected: you are outside the store geofence.';
          }
        }
      } else {
        // No location reading provided
        if (manual_confirmation_requested) {
          verdict = 'awaiting_manager_confirmation';
          phase = 'awaiting_manager_confirmation';
          locationCheck = 'out_of_range';
          flags.push({ code: 'NO_LOCATION', label: 'Check-in without location reading' });
          message = 'Location unavailable. Sent to Store Manager for manual confirmation.';

          const approval = await ApprovalRequest.create({
            storeId,
            kind: 'manual_checkin',
            requesterId: caller!.userId,
            requesterName: caller!.displayName,
            summary: `${caller!.displayName} manual check-in (no GPS)`,
            detail: { client_timestamp: clientDate.toISOString() },
            status: 'pending',
            complianceFlag: { flagged: true, reason: 'No GPS location reading provided' },
            declineReasons: ['Could not verify attendance', 'Unscheduled shift'],
          });
          approvalRequestId = approval._id.toString();
        } else {
          return apiError('LOCATION_REQUIRED', 'Location reading is required for check-in', 400);
        }
      }

      if (verdict === 'outside_geofence') {
        return NextResponse.json(
          {
            verdict,
            server_timestamp: new Date().toISOString(),
            message,
            flags,
          },
          { status: 400 }
        );
      }

      // Save or update attendance record
      if (!attendance) {
        attendance = new AttendanceRecord({
          userId: caller!.userId,
          userName: caller!.displayName,
          storeId,
          date: todayStr,
          phase,
          checkedInAt: phase === 'checked_in' ? clientDate : undefined,
          locationCheck,
          locationReading: location_reading,
          flags,
          approvalRequestId,
          workedMinutes: 0,
        });
      } else {
        attendance.phase = phase;
        if (phase === 'checked_in') attendance.checkedInAt = clientDate;
        attendance.locationCheck = locationCheck;
        attendance.locationReading = location_reading;
        attendance.flags = flags;
        attendance.approvalRequestId = approvalRequestId;
      }

      await attendance.save();

      return NextResponse.json({
        verdict,
        server_timestamp: new Date().toISOString(),
        message,
        flags,
        phase,
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Check-in failed', 500);
    }
  });
}

