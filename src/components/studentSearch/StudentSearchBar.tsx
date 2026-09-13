import React, { useEffect, useRef } from 'react';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

interface StudentSearchBarProps {
  query: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const StudentSearchBar: React.FC<StudentSearchBarProps> = ({
  query,
  onChange,
  onSearch,
  onClear,
  isLoading = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Pressing '/' focuses search input when not typing in another input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl shadow-slate-950/40 p-1.5 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
        <div className="flex items-center justify-center pl-3.5 pr-2 text-slate-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-indigo-400/90" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by Codeneksa ID, name, hall ticket, email or phone..."
          className="w-full py-2.5 px-2 bg-transparent text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none font-medium"
        />

        <div className="flex items-center gap-2 pr-1.5">
          {query && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-slate-400">
            <span>↵ Enter</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            className="shadow-sm shadow-indigo-600/30 font-semibold px-4 shrink-0"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Search
          </Button>
        </div>
      </div>
    </form>
  );
};
