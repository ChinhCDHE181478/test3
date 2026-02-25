"use server";

import { cookies } from "next/headers";

interface StoreTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export async function storeToken(
  request: any,
  rememberMe: boolean
) {
  (await cookies()).set({
    name: "access_token",
    value: request.accessToken,
    maxAge: 259200,  // 1 day
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  if (rememberMe) {
    (await cookies()).set({
      name: "refresh_token",
      value: request.refreshToken,
      maxAge: 259200,  // 1 week
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
  } else {
    (await cookies()).set({
      name: "refresh_token",
      value: request.refreshToken,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
  }
}
