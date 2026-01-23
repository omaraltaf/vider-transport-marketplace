import React from 'react';
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  Save,
  Download,
  Upload,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Building,
  Truck,
  Package,
  Mail,
  Phone,
  MessageSquare,
  Bell,
  type LucideIcon,
} from 'lucide-react';

// Icon name mapping
export const iconMap = {
  // Navigation
  menu: Menu,
  x: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  
  // Actions
  plus: Plus,
  edit: Edit,
  trash: Trash2,
  save: Save,
  download: Download,
  upload: Upload,
  
  // Status
  check: Check,
  'alert-circle': AlertCircle,
  info: Info,
  'alert-triangle': AlertTriangle,
  
  // Content
  search: Search,
  filter: Filter,
  calendar: Calendar,
  clock: Clock,
  'map-pin': MapPin,
  
  // User
  user: User,
  users: Users,
  building: Building,
  truck: Truck,
  package: Package,
  
  // Communication
  mail: Mail,
  phone: Phone,
  'message-square': MessageSquare,
  bell: Bell,
} as const;

export type IconName = keyof typeof iconMap;

export interface IconProps {
  name?: IconName;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  'aria-label'?: string;
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const Icon: React.FC<IconProps> = ({
  name,
  icon: CustomIcon,
  size = 'md',
  color,
  className = '',
  'aria-label': ariaLabel,
}) => {
  // Use custom icon if provided, otherwise look up by name
  const IconComponent = CustomIcon || (name ? iconMap[name] : null);
  
  if (!IconComponent) {
    console.warn('Icon: No icon provided or invalid icon name');
    return null;
  }
  
  const pixelSize = sizeMap[size];
  
  const ariaProps = ariaLabel
    ? { 'aria-label': ariaLabel }
    : { 'aria-hidden': true };
  
  return (
    <IconComponent
      size={pixelSize}
      color={color}
      className={className}
      {...ariaProps}
    />
  );
};

Icon.displayName = 'Icon';
