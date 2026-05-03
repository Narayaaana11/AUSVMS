import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/input";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>("system");

  // Function to apply theme based on system preference or saved preference
  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    const isDark = 
      newTheme === "dark" || 
      (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    root.classList.toggle("dark", isDark);
    return isDark ? "dark" : "light";
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      setTheme("system");
      applyTheme("system");
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = {
      light: "dark",
      dark: "system",
      system: "light"
    }[theme] as Theme;
    
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  // Determine which icon to show based on current theme
  const getActiveIcon = () => {
    if (theme === "system") {
      return <Monitor className="h-4 w-4" />;
    } else if (theme === "light") {
      return <Sun className="h-4 w-4" />;
    } else {
      return <Moon className="h-4 w-4" />;
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="relative h-9 w-9 p-0 border-0 bg-surface-container hover:bg-surface-container-high transition-all duration-200"
      title={`Current theme: ${theme}. Click to switch.`}
    >
      {getActiveIcon()}
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </Button>
  );
};

export default ThemeToggle;