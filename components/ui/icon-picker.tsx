// 该组件是一个图标选择器，允许用户从预定义的 Lucide 图标列表中搜索和选择图标。
// 用户选择后，会通过回调函数将所选图标的名称传递出去。
// 它还支持清除当前选择的功能。
import React, { useState, useMemo } from 'react';
import {
  // Original & Added Icons (Merged and Deduplicated)
  Coffee, Briefcase, BookOpen, Users, Smile, Activity, Anchor, Award, Settings, Trash2, Edit3, PlusCircle, ListChecks, Info, AlertCircle, CheckCircle, XCircle, LucideProps, LucideIcon,
  Home, Calendar, Clock, MessageSquare, Bell, Folder, FileText, Image, Video, Mic, Search, Filter, Settings as SettingsIcon,
  Sliders, Menu, MoreHorizontal, MoreVertical, Grid, Layout, Rows, Columns, User, Key, Lock, Unlock, Eye, EyeOff, Power, Link, ExternalLink, Paperclip, ThumbsUp, ThumbsDown, Heart, Star, Tag, Bookmark, Flag,
  PenTool, Brush, Palette, Crop, Maximize, Minimize, ZoomIn, ZoomOut, RotateCcw, RefreshCcw, Shuffle, Repeat, Save, UploadCloud, DownloadCloud, Terminal, Code, GitMerge, HardDrive, Server, Database, Cpu, Wrench, Cog,
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart2, PieChart, Gift, Package, Truck, Banknote, Coins, Receipt,
  Mail, Phone, MessageCircle, Share2, Users as UsersGroup, UserCheck, UserPlus, AtSign, Rss,
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Film, Music, Airplay, Radio, MicVocal, Headphones,
  MapPin, Map, Navigation, Globe, Compass, Milestone, Route,
  Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind, Waves, Leaf, Sprout, Droplet, Thermometer, Zap, Flame,
  Smartphone, Tablet, Laptop, Tv, Watch, Printer, Camera, Keyboard, MousePointer, Speaker, Disc, BatteryCharging, Battery, Lightbulb,
  Archive, Box, Briefcase as BriefcaseAlt,
  Inbox, CalendarDays, ListOrdered, ListTodo, Target, Check, ChevronsUp, ChevronsDown, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Award as AwardAlt,
  Ghost, Rocket, Puzzle, Shield, HelpCircle, Aperture, Gamepad, Dice5, Coffee as CoffeeCup,
  ShoppingBag, Umbrella, Bike, Car, Plane, Ship, Train, Building, Home as HomeAlt, School, Pizza, Sandwich, Beer, Wine
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Define a type for the icon names we will use for safety
export type PickableIconName =
  // Original Icons
  | 'Coffee' | 'Briefcase' | 'BookOpen' | 'Users' | 'Smile' | 'Activity'
  | 'Anchor' | 'Award' | 'Settings' | 'Trash2' | 'Edit3' | 'PlusCircle'
  | 'ListChecks' | 'Info' | 'AlertCircle' | 'CheckCircle' | 'XCircle'
  // Added Icons - Set 1
  | 'Home' | 'Calendar' | 'Clock' | 'MessageSquare' | 'Bell' | 'Folder' | 'FileText' | 'Image' | 'Video' | 'Mic' | 'Search' | 'Filter' | 'SettingsIcon'
  | 'Sliders' | 'Menu' | 'MoreHorizontal' | 'MoreVertical' | 'Grid' | 'Layout' | 'Rows' | 'Columns' | 'User' | 'Key' | 'Lock' | 'Unlock' | 'Eye' | 'EyeOff' | 'Power' | 'Link' | 'ExternalLink' | 'Paperclip' | 'ThumbsUp' | 'ThumbsDown' | 'Heart' | 'Star' | 'Tag' | 'Bookmark' | 'Flag'
  // Added Icons - Set 2
  | 'PenTool' | 'Brush' | 'Palette' | 'Crop' | 'Maximize' | 'Minimize' | 'ZoomIn' | 'ZoomOut' | 'RotateCcw' | 'RefreshCcw' | 'Shuffle' | 'Repeat' | 'Save' | 'UploadCloud' | 'DownloadCloud' | 'Terminal' | 'Code' | 'GitMerge' | 'HardDrive' | 'Server' | 'Database' | 'Cpu' | 'Wrench' | 'Cog'
  // Added Icons - Set 3
  | 'ShoppingCart' | 'CreditCard' | 'DollarSign' | 'TrendingUp' | 'BarChart2' | 'PieChart' | 'Gift' | 'Package' | 'Truck' | 'Banknote' | 'Coins' | 'Receipt'
  // Added Icons - Set 4
  | 'Mail' | 'Phone' | 'MessageCircle' | 'Share2' | 'UsersGroup' | 'UserCheck' | 'UserPlus' | 'AtSign' | 'Rss'
  // Added Icons - Set 5
  | 'Play' | 'Pause' | 'SkipForward' | 'SkipBack' | 'Volume2' | 'VolumeX' | 'Film' | 'Music' | 'Airplay' | 'Radio' | 'MicVocal' | 'Headphones'
  // Added Icons - Set 6
  | 'MapPin' | 'Map' | 'Navigation' | 'Globe' | 'Compass' | 'Milestone' | 'Route'
  // Added Icons - Set 7
  | 'Sun' | 'Moon' | 'Cloud' | 'CloudSun' | 'CloudRain' | 'CloudSnow' | 'CloudLightning' | 'Wind' | 'Waves' | 'Leaf' | 'Sprout' | 'Droplet' | 'Thermometer' | 'Zap' | 'Flame'
  // Added Icons - Set 8
  | 'Smartphone' | 'Tablet' | 'Laptop' | 'Tv' | 'Watch' | 'Printer' | 'Camera' | 'Keyboard' | 'MousePointer' | 'Speaker' | 'Disc' | 'BatteryCharging' | 'Battery' | 'Lightbulb'
  // Added Icons - Set 9
  | 'Archive' | 'Box' | 'BriefcaseAlt'
  | 'Inbox' | 'CalendarDays' | 'ListOrdered' | 'ListTodo' | 'Target' | 'Check' | 'ChevronsUp' | 'ChevronsDown' | 'ChevronsLeft' | 'ChevronsRight' | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  // Added Icons - Set 10
  | 'AwardAlt'
  | 'Ghost' | 'Rocket' | 'Puzzle' | 'Shield' | 'HelpCircle' | 'Aperture' | 'Gamepad' | 'Dice5' | 'CoffeeCup'
  | 'ShoppingBag' | 'Umbrella' | 'Bike' | 'Car' | 'Plane' | 'Ship' | 'Train' | 'Building' | 'HomeAlt' | 'School' | 'Pizza' | 'Sandwich' | 'Beer' | 'Wine';

interface IconPickerProps {
  onSelectIcon: (iconName: PickableIconName | null) => void;
  currentIcon?: PickableIconName | null;
}

// Map of the curated icons we want to offer
const iconMap: Record<PickableIconName, LucideIcon> = {
  // Original Icons
  Coffee, Briefcase, BookOpen, Users, Smile, Activity, Anchor, Award, Settings, Trash2, Edit3, PlusCircle, ListChecks, Info, AlertCircle, CheckCircle, XCircle,
  // Added Icons - Set 1
  Home, Calendar, Clock, MessageSquare, Bell, Folder, FileText, Image, Video, Mic, Search, Filter, SettingsIcon,
  Sliders, Menu, MoreHorizontal, MoreVertical, Grid, Layout, Rows, Columns, User, Key, Lock, Unlock, Eye, EyeOff, Power, Link, ExternalLink, Paperclip, ThumbsUp, ThumbsDown, Heart, Star, Tag, Bookmark, Flag,
  // Added Icons - Set 2
  PenTool, Brush, Palette, Crop, Maximize, Minimize, ZoomIn, ZoomOut, RotateCcw, RefreshCcw, Shuffle, Repeat, Save, UploadCloud, DownloadCloud, Terminal, Code, GitMerge, HardDrive, Server, Database, Cpu, Wrench, Cog,
  // Added Icons - Set 3
  ShoppingCart, CreditCard, DollarSign, TrendingUp, BarChart2, PieChart, Gift, Package, Truck, Banknote, Coins, Receipt,
  // Added Icons - Set 4
  Mail, Phone, MessageCircle, Share2, UsersGroup, UserCheck, UserPlus, AtSign, Rss,
  // Added Icons - Set 5
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Film, Music, Airplay, Radio, MicVocal, Headphones,
  // Added Icons - Set 6
  MapPin, Map, Navigation, Globe, Compass, Milestone, Route,
  // Added Icons - Set 7
  Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind, Waves, Leaf, Sprout, Droplet, Thermometer, Zap, Flame,
  // Added Icons - Set 8
  Smartphone, Tablet, Laptop, Tv, Watch, Printer, Camera, Keyboard, MousePointer, Speaker, Disc, BatteryCharging, Battery, Lightbulb,
  // Added Icons - Set 9
  Archive, Box, BriefcaseAlt,
  Inbox, CalendarDays, ListOrdered, ListTodo, Target, Check, ChevronsUp, ChevronsDown, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  // Added Icons - Set 10
  AwardAlt,
  Ghost, Rocket, Puzzle, Shield, HelpCircle, Aperture, Gamepad, Dice5, CoffeeCup,
  ShoppingBag, Umbrella, Bike, Car, Plane, Ship, Train, Building, HomeAlt, School, Pizza, Sandwich, Beer, Wine
};

const curatedIconNames = Object.keys(iconMap) as PickableIconName[];

export function IconPicker({ onSelectIcon, currentIcon }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return curatedIconNames;
    }
    return curatedIconNames.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleIconSelect = (iconName: PickableIconName | null) => {
    onSelectIcon(iconName);
  };

  return (
    <div className="flex flex-col h-[clamp(300px,50vh,400px)]"> {/* Adjusted height */}
      <div className="p-2 border-b">
        <Input
          type="text"
          placeholder="搜索图标... (例如: Coffee, Book)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        <Button variant="ghost" onClick={() => handleIconSelect(null)} className="mt-2 w-full text-xs text-muted-foreground">
          清除选择 / 无图标
        </Button>
      </div>
      <ScrollArea className="flex-grow p-1">
        {filteredIcons.length === 0 && (
          <p className="text-center text-muted-foreground py-6">未找到匹配的图标。</p>
        )}
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-1 p-2"> {/* Adjusted grid and gap */}
          {filteredIcons.map((iconName) => {
            const IconComponent = iconMap[iconName];
            const isSelected = currentIcon === iconName;
            return (
              <Button
                key={iconName}
                variant={isSelected ? "secondary" : "outline"}
                className={cn(
                  'flex flex-col items-center justify-center h-16 w-full p-1 aspect-square',
                  isSelected && 'ring-2 ring-primary border-primary shadow-lg bg-primary/10' // Enhanced visual feedback
                )}
                onClick={() => handleIconSelect(iconName)}
                title={iconName}
              >
                <IconComponent className="h-5 w-5 mb-0.5" />
                <span className="text-[10px] truncate max-w-full leading-tight">{iconName}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 