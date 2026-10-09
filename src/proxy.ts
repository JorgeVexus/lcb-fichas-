import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (isValidSession(session)) {
    // Sesión deslizante: cada petición válida renueva la cookie otros 30
    // días, así quien usa la herramienta seguido nunca ve expirar la suya.
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, session!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  }

  // Un redirect a /login convertía el POST de /api/pdf en un POST a /login
  // (405) y el editor solo mostraba "No se pudo generar el PDF". Para las
  // API se responde 401 explícito y el editor lo distingue.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Deja pasar sin sesión: /login, /api/login, los internos de Next, y
  // cualquier archivo estático servido tal cual desde public/ (logo, íconos,
  // etc.) -- si no, el <img> del logo carga el HTML de /login en vez de la
  // imagen.
  matcher: ["/((?!login|api/login|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
