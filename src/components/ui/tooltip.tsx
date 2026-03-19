import * as React from "react";

// Lightweight tooltip provider that avoids the radix-ui duplicate React bug.
// Radix TooltipProvider calls useRef against a second React copy in the
// pre-bundled Vite chunk, crashing the entire app. This shim provides the
// same API surface so every consumer keeps working.

const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number; skipDelayDuration?: number }> = ({ children }) => (
  <>{children}</>
);

const Tooltip: React.FC<{ children: React.ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }> = ({ children }) => (
  <>{children}</>
);

const TooltipTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, ...props }, ref) => {
    if (props.asChild) return <>{children}</>;
    return <button ref={ref} {...props}>{children}</button>;
  }
);
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: string; sideOffset?: number }>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={className} style={{ display: "none" }} {...props}>
      {children}
    </div>
  )
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
