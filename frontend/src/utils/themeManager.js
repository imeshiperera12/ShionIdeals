// Theme manager for dark/light mode
export const themes = {
  light: {
    background: "#ffffff",
    foreground: "#1a1a1a",
    card: "#f8f9fa",
    border: "#e0e0e0",
    primary: "#0066cc",
    primaryHover: "#0052a3",
    secondary: "#6c757d",
    success: "#28a745",
    danger: "#dc3545",
    warning: "#ffc107",
    text: "#212529",
    textMuted: "#6c757d",
  },
  dark: {
    background: "#1a1a1a",
    foreground: "#ffffff",
    card: "#2d2d2d",
    border: "#404040",
    primary: "#00a8ff",
    primaryHover: "#0088cc",
    secondary: "#9ca3af",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    text: "#e5e7eb",
    textMuted: "#9ca3af",
  },
}

export const getTheme = (isDark) => {
  return isDark ? themes.dark : themes.light
}

export const loadTheme = () => {
  const saved = localStorage.getItem("admin-theme")
  if (saved) return saved === "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export const saveTheme = (isDark) => {
  localStorage.setItem("admin-theme", isDark ? "dark" : "light")
}
