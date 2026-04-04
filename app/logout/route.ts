import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/login", "https://portal.urisacompresores.com")
  );

  response.cookies.set("sb-access-token", "", {
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("sb-refresh-token", "", {
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("auth-token", "", {
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("session", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}