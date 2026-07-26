interface FeedbackMessageProps {
  type: "error" | "success" | "info";
  children: string;
}

export function FeedbackMessage({
  type,
  children,
}: FeedbackMessageProps) {
  const role = type === "error" ? "alert" : "status";

  return (
    <div className={`feedback feedback--${type}`} role={role}>
      {children}
    </div>
  );
}
