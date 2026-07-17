import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sanitize from 'sanitize-filename';
import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import InstantAnnouncement from '@/models/InstantAnnouncement';
import Announcement from '@/models/AnnouncementFiles';
import User from '@/models/User';
import AssignedDevice from '@/models/AssignDevice';
import { sendPushNotification } from '@/lib/firebase-admin';

// ==================== POST - Upload and Save Announcement ====================
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    console.log("Content-Type:", contentType);

    if (contentType.startsWith('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const name = formData.get('name') as string;
      const userId = formData.get('userId') as string;
      const type = formData.get('type') as string;
      const alertDataStr = formData.get('alertData') as string;
      const serialNumber = formData.get('serialNumber') as string || formData.get('deviceId') as string;

      console.log("Received data:", { userId, fileName: file?.name, name, type, hasAlert: !!alertDataStr });

      if (alertDataStr && serialNumber) {
        try {
          await connectToDatabase();
          const device = await Device.findOne({ serialNumber });
          if (device) {
            const assignment = await AssignedDevice.findOne({ deviceId: device._id });
            if (assignment && assignment.userId) {
              const storeUser = await User.findById(assignment.userId);
              if (storeUser) {
                const parsedAlert = typeof alertDataStr === 'string' ? JSON.parse(alertDataStr) : alertDataStr;
                storeUser.activeAlerts = storeUser.activeAlerts || [];
                storeUser.activeAlerts.push(parsedAlert);
                await storeUser.save();

                if (storeUser.fcmTokens && storeUser.fcmTokens.length > 0) {
                  const title = parsedAlert.title || 'New Alert';
                  const message = parsedAlert.message || 'You have a new alert.';
                  await sendPushNotification(storeUser.fcmTokens, title, message, {
                    action: 'refresh_dashboard',
                    type: parsedAlert.type || 'alert'
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("Error processing alertData in formData:", err);
        }
      }

      if (!userId || !file || !name || !type) {
        return NextResponse.json({ 
          success: false, 
          message: 'Missing required fields',
          received: { userId: !!userId, file: !!file, name: !!name, type: !!type }
        }, { status: 400 });
      }

      // Save file to filesystem
      const baseUploadPath = join(process.cwd(),  'uploads', 'instantaneous', userId, type);
      
      if (!existsSync(baseUploadPath)) {
        await mkdir(baseUploadPath, { recursive: true });
      }

      // Enforce file limit (10 max)
      const files = await readdir(baseUploadPath);
      if (files.length >= 10) {
        const fileStats = await Promise.all(
          files.map(async (f) => {
            const filePath = join(baseUploadPath, f);
            const stats = await stat(filePath);
            return { file: f, time: stats.mtime.getTime() };
          })
        );

        fileStats.sort((a, b) => a.time - b.time);
        const oldestFile = fileStats[0].file;
        await unlink(join(baseUploadPath, oldestFile));
        console.log(`Deleted oldest file: ${oldestFile}`);
      }

      // Save new file
      const originalFileName = sanitize(file.name || name);
      const uniqueFileName = `${uuidv4()}-${originalFileName}`;
      const filePath = join(baseUploadPath, uniqueFileName);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      const relPath = `/uploads/instantaneous/${userId}/${type}/${uniqueFileName}`;
      
      console.log(`File saved successfully: ${relPath}`);
      
      return NextResponse.json({ 
        success: true, 
        fileUrl: relPath,
        fileName: uniqueFileName
      });

    } else if (contentType.includes('application/json')) {
      // ==================== Handle Sending Announcement to Device ====================
      await connectToDatabase();

      const body = await req.json();
      const { userId, deviceId, audioUrl, announcementName, alertData } = body;

      console.log("Sending announcement:", { userId, deviceId, audioUrl, announcementName, hasAlert: !!alertData });

      if (!userId || !deviceId || !audioUrl || !announcementName) {
        return NextResponse.json({
          success: false,
          message: 'Missing required fields'
        }, { status: 400 });
      }

      // Find the device by serial number
      const device = await Device.findOne({ serialNumber: deviceId });
      if (!device) {
        return NextResponse.json({
          success: false,
          message: 'Device not found'
        }, { status: 404 });
      }

      if (alertData) {
        try {
          const assignment = await AssignedDevice.findOne({ deviceId: device._id });
          if (assignment && assignment.userId) {
            const storeUser = await User.findById(assignment.userId);
            if (storeUser) {
              const parsedAlert = typeof alertData === 'string' ? JSON.parse(alertData) : alertData;
              storeUser.activeAlerts = storeUser.activeAlerts || [];
              storeUser.activeAlerts.push(parsedAlert);
              await storeUser.save();

              if (storeUser.fcmTokens && storeUser.fcmTokens.length > 0) {
                const title = parsedAlert.title || 'New Alert';
                const message = parsedAlert.message || 'You have a new alert.';
                await sendPushNotification(storeUser.fcmTokens, title, message, {
                  action: 'refresh_dashboard',
                  type: parsedAlert.type || 'alert'
                });
              }
            }
          }
        } catch (err) {
          console.error("Error processing alertData in JSON:", err);
        }
      }

      // Create or find the announcement file record
      let announcementFile = await Announcement.findOne({ path: audioUrl });
      
      if (!announcementFile) {
        // Create new announcement file record
        announcementFile = await Announcement.create({
          userId,
          name: announcementName,
          path: audioUrl,
          type: 'uploaded',
          // You might want to calculate duration here if needed
          duration: 0
        });
      }

      // Create instant announcement record
      const instantAnnouncement = await InstantAnnouncement.create({
        deviceId: device._id,
        file: announcementFile._id,
        userId,
      
      });

      console.log('Instant announcement created:', instantAnnouncement);

      return NextResponse.json({
        success: true,
        message: 'Announcement sent successfully',
        announcement: {
          id: instantAnnouncement._id,
          deviceId: device._id,
          audioUrl: `https://iot.centelon.com${audioUrl}`
        }
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Unsupported Content-Type',
        receivedContentType: contentType
      }, { status: 415 });
    }

  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process request',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
