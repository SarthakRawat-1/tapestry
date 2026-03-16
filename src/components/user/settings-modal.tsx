'use client';

import { useAuthStore } from '@/lib/stores/use-auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Monitor } from 'lucide-react';
import { ThemeSelector } from '@/components/ui/theme-toggle';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[92vw]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Account Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Current User Info */}
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
              <AvatarFallback>
                {user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
            </div>
            <ThemeSelector />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="min-h-11 text-xs sm:text-sm"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
