/**
 * Minimal type declarations for lucide-react-native (v1).
 *
 * Lucide icons are SVG-based React Native components that accept
 * size, color, and strokeWidth as props.
 */
declare module "lucide-react-native" {
  import type { ComponentType } from "react";
  import type { SvgProps } from "react-native-svg";

  type IconProps = SvgProps & {
    size?: number;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
  };

  type LucideIcon = ComponentType<IconProps>;

  // Navigation / UI
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const X: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Menu: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const Home: LucideIcon;
  export const Bell: LucideIcon;
  export const User: LucideIcon;
  export const LogOut: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Trash2: LucideIcon;
  export const Edit: LucideIcon;
  export const Copy: LucideIcon;
  export const Clipboard: LucideIcon;
  export const ExternalLink: LucideIcon;

  // Status / Feedback
  export const CircleAlert: LucideIcon;
  export const CircleCheck: LucideIcon;
  export const CircleX: LucideIcon;
  export const CircleHelp: LucideIcon;
  export const Info: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Loader: LucideIcon;
  export const LoaderCircle: LucideIcon;

  // Content / Files
  export const Paperclip: LucideIcon;
  export const File: LucideIcon;
  export const FileText: LucideIcon;
  export const Image: LucideIcon;
  export const Download: LucideIcon;
  export const Upload: LucideIcon;

  // Communication
  export const MessageSquare: LucideIcon;
  export const Send: LucideIcon;
  export const Mail: LucideIcon;

  // Education
  export const GraduationCap: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Award: LucideIcon;
  export const Trophy: LucideIcon;
  export const Medal: LucideIcon;

  // Misc
  export const Inbox: LucideIcon;
  export const Calendar: LucideIcon;
  export const Clock: LucideIcon;
  export const Star: LucideIcon;
  export const Heart: LucideIcon;
  export const Share2: LucideIcon;
  export const Link: LucideIcon;
  export const QrCode: LucideIcon;
  export const Camera: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const CheckCheck: LucideIcon;
  export const GripVertical: LucideIcon;
  export const Timer: LucideIcon;
  export const Zap: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Table2: LucideIcon;
  export const Presentation: LucideIcon;
  export const Lock: LucideIcon;
  export const KeyRound: LucideIcon;
}
