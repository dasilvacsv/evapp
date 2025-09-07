// utils/supabase/middleware.ts

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

interface ProtectedRoute {
  path: string;
  resource: string;
  action: string;
}

// Define protected routes and their required permissions
const protectedRoutes: ProtectedRoute[] = [
  { 
    path: "/admin",
    resource: "admin_panel",
    action: "access"
  },
  { 
    path: "/events",
    resource: "events",
    action: "view"
  },
  {
    path: "/invoices",
    resource: "invoices",
    action: "view"
  },
  // Add more routes as needed
];

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Handle authentication checks first
    if (request.nextUrl.pathname.startsWith("/protected") && userError) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    if (request.nextUrl.pathname === "/" && !userError) {
      return NextResponse.redirect(new URL("/protected", request.url));
    }

    // If user is authenticated, perform ABAC checks for protected routes
    if (user) {
      // Find matching protected route
      const matchingRoute = protectedRoutes.find(route => 
        request.nextUrl.pathname.startsWith(route.path)
      );

      if (matchingRoute) {
        // Perform ABAC check using the check_access function
        const { data: isAllowed, error: accessError } = await supabase.rpc('check_access', {
          p_user_id: user.id,
          p_resource: matchingRoute.resource,
          p_action: matchingRoute.action,
          p_context: {
            path: request.nextUrl.pathname,
            method: request.method,
          }
        });

        if (accessError || !isAllowed) {
          // Redirect to unauthorized page or show error
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    console.error('Middleware error:', e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};