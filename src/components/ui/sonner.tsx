"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border)",
          fontSize: "14px",
          padding: "12px 16px",
          minHeight: "40px",
          borderRadius: "8px",
        },
        className: "toast-body",
        descriptionClassName: "toast-description",
      }}
      closeButton={false}
      expand={false}
      visibleToasts={3}
      position="top-center"
      {...props}
    />
  )
}

export { Toaster }
