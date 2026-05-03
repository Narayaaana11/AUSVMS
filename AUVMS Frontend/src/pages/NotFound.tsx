import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50"
    >
      <div className="text-center space-y-6 px-4 max-w-md">
        <img
          src="/auslogo.png"
          alt="Aditya University"
          className="h-16 w-auto mx-auto rounded-lg shadow-lg"
        />
        <div className="space-y-3">
          <h1 className="text-6xl font-bold text-blue-900">404</h1>
          <p className="text-2xl font-semibold text-gray-800">Page Not Found</p>
          <p className="text-gray-600 text-base">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <a
          href="/"
          className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
