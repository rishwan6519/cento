import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import Slider from "@/models/Slider";
import { connectToDatabase } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const userId = formData.get("userId") as string;
    const sliderName = (formData.get("sliderName") as string) || "My Slider"; // get slider name
    const files = formData.getAll("files[]") as File[];
    const descriptions = formData.getAll("descriptions[]") as string[];
    const existingSlidersStr = formData.get("existingSliders") as string;
    const existingSliders = existingSlidersStr ? JSON.parse(existingSlidersStr) : [];

    if ((!files || files.length === 0) && existingSliders.length === 0) {
      return NextResponse.json(
        { success: false, message: "No images provided" },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "sliders", userId);
    await mkdir(uploadsDir, { recursive: true });

    const slidersData = [...existingSliders];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const desc = descriptions[i] || "";

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path.join(uploadsDir, fileName);

      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

      slidersData.push({ url: `/uploads/sliders/${userId}/${fileName}`, description: desc });
    }

    // Always create a new slider document (group)
    const sliderDoc = await Slider.create({
      userId,
      sliderName,
      sliders: slidersData,
      assignedDevices: [],
    });

    return NextResponse.json({ success: true, data: sliderDoc });
  } catch (error) {
    console.error("Slider upload error:", error);
    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    await connectToDatabase();
    const sliders = await Slider.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: sliders });
  } catch (error) {
    console.error("Fetch sliders error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch sliders" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { sliderId, sliderName, sliders } = body;

    if (!sliderId) {
      return NextResponse.json({ success: false, message: "Slider ID is required" }, { status: 400 });
    }

    const updatedSlider = await Slider.findByIdAndUpdate(
      sliderId,
      { sliderName, sliders },
      { new: true }
    );

    if (!updatedSlider) {
      return NextResponse.json({ success: false, message: "Slider group not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedSlider });
  } catch (error) {
    console.error("Update slider error:", error);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}
