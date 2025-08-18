import { auth } from "@/src/lib/auth";

export async function GET(request: Request) {
  try {
    // Test if auth is initialized
    const testResponse = {
      status: "ok",
      message: "Better Auth is configured",
      config: {
        hasGoogleProvider: !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        hasDatabase: true,
        baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL || "http://localhost:8081/api/auth",
        isDevelopment: process.env.EXPO_PUBLIC_DEV_MODE === 'true',
      }
    };

    return Response.json(testResponse);
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
