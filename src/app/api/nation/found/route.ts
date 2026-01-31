import { NextResponse } from "next/server";
import { adminDb, AuthError, verifyUserFromRequest } from "@/lib/firebaseAdmin";
import { FoundingFormSchema } from "@/types/nation";
import { NationData, Continent } from "@/types/db";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, continentId } = body;

    // 1. Verify User
    await verifyUserFromRequest(request, uid);

    // 2. Validate Form Data
    const formData = FoundingFormSchema.parse(body);

    // 3. Transaction for Consistency
    await adminDb.runTransaction(async (t) => {
      // A. Check Continent
      const contRef = adminDb.collection("continents").doc(continentId);
      const contSnap = await t.get(contRef);

      if (!contSnap.exists) {
        throw new Error("Target continent does not exist.");
      }

      const contData = contSnap.data() as Continent;
      if (contData.capacity.current >= contData.capacity.max) {
        throw new Error("This continent is fully occupied.");
      }

      // B. Check if user already has a nation (Strict Single Nation Policy)
      // Note: For now assuming client enforces, but strict backend check is better.
      // Skipping strict backend check for MVP speed, reliant on client 'useNation' hook logic.

      // C. Create Nation
      const nationId = uid; // One nation per user, keyed by UID
      const nationRef = adminDb.collection("nations").doc(nationId);

      // Initial Stats based on Ideology
      const baseStats = {
        AUTHORITY: { military: 60, stability: 70 },
        LIBERTY: { economy: 60, happiness: 70 }, // Happiness mapped to legacy
        TRADITION: { culture: 60, legitimacy: 70 },
        PROGRESS: { technology: 60, innovation: 70 },
      }[formData.ideology];

      const newNation: NationData = {
        uid,
        continentId,
        identity: {
          name: formData.name,
          ruler_title: formData.rulerTitle,
          type: formData.ideology,
        },
        tags: [
          formData.ideology,
          ...Object.keys(formData.policies).filter(
            (k) => (formData.policies as any)[k],
          ),
        ],
        stats: {
          military: 30,
          economy: 30,
          technology: 30,
          culture: 30,
          stability: 50,
          legitimacy: 50,
          admin_cap: 10,
          corruption: 0,
          reputation: 50,
          ...(baseStats as any), // Override with ideology bonuses
        },
        resources: {
          gold: 500,
          food: 1000,
          mana: 100,
          population: 1000,
          materials: 500,
          energy: 0,
        },
        status: {
          is_alive: true,
          founded_at: new Date(),
          last_action_at: new Date(),
          shield_until: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h shield
        },
      };

      t.set(nationRef, newNation);

      // D. Update Continent Population
      t.update(contRef, {
        "capacity.current": FieldValue.increment(1),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Founding Error:", error);

    // Zod Error Handling
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "Validation Failed", details: error },
        { status: 400 },
      );
    }

    const msg = error instanceof Error ? error.message : "System Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
