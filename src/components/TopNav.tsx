import { AppTab } from "../types";

interface TopNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const NAV_ITEMS: { id: Exclude<AppTab, "quiz">; label: string }[] = [
  { id: "alphabet", label: "Bảng chữ cái" },
  { id: "flashcard", label: "Flashcard" },
  { id: "vocab", label: "Từ vựng" },
];

export function TopNav({ activeTab, onSelectTab }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        <button
          type="button"
          onClick={() => onSelectTab("alphabet")}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded"
        >
          KanaStudio
        </button>

        <nav
          aria-label="Điều hướng chính"
          className="hidden sm:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded ${
                  isActive
                    ? "text-blue-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab("quiz")}
            aria-current={activeTab === "quiz" ? "page" : undefined}
            className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
              activeTab === "quiz"
                ? "bg-slate-900 text-white"
                : "bg-blue-700 text-white hover:bg-blue-800"
            }`}
          >
            Kiểm tra nhanh
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <nav
        aria-label="Điều hướng di động"
        className="sm:hidden border-t border-slate-100 px-4 flex items-center justify-around"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative py-2.5 px-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? "text-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
