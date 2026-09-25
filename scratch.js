const fs = require('fs');
const path = 'c:/Users/krishwan/OneDrive - Centelon IT Solutions LLP/Desktop/cento-local (1)/cento-local/src/app/api/external/offer_approval/route.ts';
let code = fs.readFileSync(path, 'utf-8');

// 1. Imports
code = code.replace(
  'import mongoose from "mongoose";',
  'import mongoose from "mongoose";\nimport OfferApprovalJobModel from "@/models/OfferApprovalJob";\nimport { v4 as uuidv4 } from "uuid";'
);

// 2. Idempotency extraction
code = code.replace(
  '    const videoUrlParam = body["video 1"] || body.videoUrl || body.url;',
  '    const videoUrlParam = body["video 1"] || body.videoUrl || body.url;\n    const idempotencyKey = body.idempotencyKey;'
);

// 3. Idempotency Check
code = code.replace(
  '    await connectToDatabase();\n\n    let mediaItem: any = null;',
  '    await connectToDatabase();\n\n    if (idempotencyKey) {\n      const existingJob = await OfferApprovalJobModel.findOne({ idempotencyKey });\n      if (existingJob) {\n        if (existingJob.status === "completed") {\n          return NextResponse.json({ ...existingJob.resultData, status: "success" });\n        }\n        return NextResponse.json({\n          status: existingJob.status,\n          jobId: existingJob.jobId,\n          message: "Offer approval is currently processing. Poll GET /api/external/offer_approval for status."\n        });\n      }\n    }\n\n    let mediaItem: any = null;'
);

// 4. Wrap in IIFE
code = code.replace(
  '    }\n\n    // 3. Process offer creation & FCM push notification if offer details were supplied',
  '    }\n\n    const jobId = uuidv4();\n    const newJob = await OfferApprovalJobModel.create({\n      jobId,\n      idempotencyKey: idempotencyKey || undefined,\n      status: "processing"\n    });\n\n    // Fire unawaited background job\n    (async () => {\n      try {\n        // 3. Process offer creation & FCM push notification if offer details were supplied'
);

// 5. End IIFE
code = code.replace(
  '    if (videoJob?.enhancedPrompt) {\n      response.enhancedPrompt = videoJob.enhancedPrompt;\n    }\n\n    return NextResponse.json(response);\n  } catch (error: any) {',
  '    if (videoJob?.enhancedPrompt) {\n      response.enhancedPrompt = videoJob.enhancedPrompt;\n    }\n\n        newJob.status = "completed";\n        newJob.resultData = response;\n        await newJob.save();\n      } catch (err: any) {\n        console.error("[external/offer_approval] Async Job Error:", err);\n        newJob.status = "failed";\n        newJob.error = err.message || String(err);\n        await newJob.save();\n      }\n    })();\n\n    return NextResponse.json({\n      success: true,\n      status: "processing",\n      jobId,\n      message: "Offer approval is processing in the background. Poll GET /api/external/offer_approval?jobId=" + jobId + " to check status."\n    });\n  } catch (error: any) {'
);

// 6. Add GET handler
code += `
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ success: false, error: "jobId query parameter is required" }, { status: 400 });
    }

    await connectToDatabase();
    const job = await OfferApprovalJobModel.findOne({ jobId });

    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed") {
      return NextResponse.json({ ...job.resultData, status: "success" });
    }

    if (job.status === "failed") {
      return NextResponse.json({ success: false, status: "failed", error: job.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: "processing",
      jobId: job.jobId,
      message: "Job is still processing"
    });
  } catch (error: any) {
    console.error("[external/offer_approval] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch job status", details: error.message || String(error) }, { status: 500 });
  }
}
`;

fs.writeFileSync(path, code);
console.log('Modified route.ts successfully!');
