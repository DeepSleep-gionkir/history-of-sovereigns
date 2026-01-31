import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUserFromRequest } from "@/lib/firebaseAdmin";
import { PolicyWeb } from "@/types/db";

// Defining Strict Types for Request
interface UpdatePolicyRequest {
  uid: string;
  category: keyof PolicyWeb;
  value: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const decodedToken = await verifyUserFromRequest(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body & Validate
    const body: UpdatePolicyRequest = await req.json();
    const { uid, category, value } = body;

    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!category || !value) {
      return NextResponse.json({ error: "Invalid Input" }, { status: 400 });
    }

    // 3. Update Firestore
    // Using dot notation to update nested field
    const updatePath = `policies.${category}`;

    await adminDb
      .collection("nations")
      .doc(uid)
      .update({
        [updatePath]: value,
        "status.last_action_at": new Date().toISOString(), // Optional: Update activity
      });

    return NextResponse.json({ success: true, category, value });
  } catch (error: unknown) {
    console.error("Policy Update Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
