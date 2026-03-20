import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AuthKeyModel } from "@/models/AuthKey";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { secret } = await req.json();
    
    const keyDoc = await AuthKeyModel.findOne({ secret });
    
    if (keyDoc) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Invalid Key" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
