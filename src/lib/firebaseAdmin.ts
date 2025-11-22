import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function initAdminApp() {
  if (getApps().length) return getApp();

  try {
    const projectId =
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (projectId && clientEmail && privateKey) {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    }

    // 마지막 수단: 애플리케이션 기본 자격 증명 사용 (GCP/Vercel에 설정되어 있어야 함)
    return initializeApp({
      credential: applicationDefault(),
      // 일부 환경에서는 projectId를 직접 지정해야 감지됨
      projectId: projectId || undefined,
    });
  } catch (error) {
    console.error(
      "Firebase Admin 초기화 실패: 서비스 계정 환경 변수를 확인하세요.",
      error
    );
    throw error;
  }
}

const adminApp = initAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

export async function verifyUserFromRequest(
  request: Request,
  expectedUid?: string
) {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : null;

  if (!token) {
    throw new AuthError("인증 토큰이 필요합니다.", 401);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (expectedUid && decoded.uid !== expectedUid) {
      throw new AuthError("UID가 일치하지 않습니다.", 403);
    }
    return decoded;
  } catch (err: unknown) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("유효하지 않은 인증 토큰입니다.", 401);
  }
}

export { AuthError };
