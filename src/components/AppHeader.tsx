import { Settings, QrCode } from "lucide-react";
import { Link } from "react-router-dom";

const AppHeader = () => {
  return (
    <header className="bg-header text-header-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <QrCode className="h-6 w-6" />
        <h1 className="text-lg font-bold tracking-tight">ScanLead</h1>
      </div>
      <Link to="/settings" className="p-2 rounded-lg hover:bg-foreground/10 transition-colors">
        <Settings className="h-5 w-5" />
      </Link>
    </header>
  );
};

export default AppHeader;
