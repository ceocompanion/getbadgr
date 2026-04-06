import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="flex-1 px-4 py-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium text-foreground">{user?.email}</p>
      </div>

      <Button variant="outline" className="w-full h-12" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default SettingsPage;
