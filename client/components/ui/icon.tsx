import type { ReactNode, CSSProperties } from "react";
import React from "react";

import { registerComponent } from "@superblocksteam/library";
import {
  Prop,
  Section,
  PropsCategory,
  tailwindStylesCategory,
  type EditorConfig,
} from "@superblocksteam/library";

import { cn } from "@/lib/utils";

// Static imports for all icons used in the app
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle,
  Clipboard,
  ClipboardList,
  Clock,
  FileText,
  Inbox,
  Info,
  LayoutDashboard,
  MapPin,
  Play,
  Plus,
  Receipt,
  Rocket,
  Settings,
  ShoppingCart,
  Square,
  Tag,
  Users,
  Wrench,
  X,
  type LucideProps,
} from "lucide-react";

// Map kebab-case icon names to their static components
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  activity: Activity,
  "alert-triangle": AlertTriangle,
  calendar: Calendar,
  check: Check,
  "check-circle": CheckCircle,
  clipboard: Clipboard,
  "clipboard-list": ClipboardList,
  clock: Clock,
  "file-text": FileText,
  inbox: Inbox,
  info: Info,
  "layout-dashboard": LayoutDashboard,
  "map-pin": MapPin,
  play: Play,
  plus: Plus,
  receipt: Receipt,
  rocket: Rocket,
  settings: Settings,
  "shopping-cart": ShoppingCart,
  square: Square,
  tag: Tag,
  tool: Wrench,
  users: Users,
  wrench: Wrench,
  x: X,
};

// Base Icon Component
interface IconComponentProps {
  icon?: string;
  children?: ReactNode;
  color?: string;
  strokeWidth?: number;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

function IconComponent({
  icon,
  children,
  onClick,
  style,
  className,
  color,
  strokeWidth,
}: IconComponentProps) {
  if (icon) {
    const LucideIcon = ICON_MAP[icon];
    if (LucideIcon) {
      return (
        <LucideIcon
          onClick={onClick}
          style={style}
          className={className}
          color={color}
          strokeWidth={strokeWidth}
        />
      );
    }
    // Fallback for unknown icons
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 text-xs",
          className,
        )}
        title={`Icon "${icon}" not found`}
        onClick={onClick}
        style={style}
      >
        ?
      </div>
    );
  }

  if (
    children &&
    (React.isValidElement(children) ||
      (Array.isArray(children) && children.length > 0))
  ) {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        style={style}
        onClick={onClick}
      >
        {children}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 text-xs",
        className,
      )}
      title={`Icon "${icon}" not found`}
      onClick={onClick}
      style={style}
    >
      ?
    </div>
  );
}

// Main Component with Registration
type IconProps = React.ComponentPropsWithoutRef<typeof IconComponent> & {
  name?: string;
} & Record<string, unknown>;

const Icon = ({
  children,
  className,
  name: _name,
  ...props
}: IconProps) => {
  return (
    <IconComponent className={cn("w-fit h-fit", className)} {...props}>
      {children}
    </IconComponent>
  );
};

// Properties Definition
const propertiesDefinition = {
  general: Section.category(PropsCategory.Content).children({
    icon: Prop.string().propertiesPanel({
      label: "Icon name",
      controlType: "ICON_SELECTOR",
      description: "The name of the Lucide icon (e.g., 'heart', 'arrow-right')",
      placeholder: "heart",
    }),
    children: Prop.jsx(),
  }),
  styles: tailwindStylesCategory({
    prioritizedTailwindProperties: ["stroke", "stroke-width"],
  }),
  events: Section.category(PropsCategory.EventHandlers).children({
    onClick: Prop.eventHandler().propertiesPanel({
      label: "onClick",
      description: "Triggered when the icon is clicked",
    }),
  }),
};

// Editor Configuration
const editorConfig: EditorConfig = {
  icon: "custom",
  description:
    "A versatile icon component supporting Lucide icons and custom content",
};

// Registration
registerComponent(Icon, propertiesDefinition).editorConfig(editorConfig);

export { Icon };
