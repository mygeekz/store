import React from "react"

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  type?: "button" | "submit" | "reset"
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = "",
  type = "button"
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded ${className}`}
    >
      {children}
    </button>
  )
}
