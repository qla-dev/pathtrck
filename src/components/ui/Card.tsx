import React from "react";
import { cn } from "../../lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  headerAction?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export const Card = ({
  children,
  className,
  contentClassName,
  title,
  headerAction,
  ...props
}: CardProps) => (
  <div
    className={cn(
      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden",
      className,
    )}
    {...props}
  >
    {title && (
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
        {headerAction}
      </div>
    )}
    <div className={cn("p-6", contentClassName)}>{children}</div>
  </div>
);
