import { RouterProvider } from "react-router";
import { AuthProvider } from "./features/auth";
import { router } from "./router";

export default function App() {
  const handleSessionExpired = () => {
    // Only redirect to /login if currently on a protected route.
    // Public routes like '/', '/diseases', '/check' remain accessible.
    const currentPath = window.location.pathname;
    const isProtected =
      currentPath.startsWith("/admin") ||
      currentPath.startsWith("/profile");

    if (isProtected) {
      void router.navigate("/login");
    }
  };

  return (
    <AuthProvider onSessionExpired={handleSessionExpired}>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
