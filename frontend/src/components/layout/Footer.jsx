import React from 'react';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-slate-900">EduShare Platform</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-primary transition-colors">Academic Guidelines</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">System Support</a>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <p>© 2026 Firefly - Digital Learning Management System. All rights reserved.</p>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </div>
    </footer>
  );
}