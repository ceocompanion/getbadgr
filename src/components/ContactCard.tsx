import { User, Building2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContactCardProps {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  createdAt: string;
  onClick?: () => void;
}

const ContactCard = ({ firstName, lastName, company, jobTitle, createdAt, onClick }: ContactCardProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl p-4 border border-border text-left hover:border-primary/30 transition-colors active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {firstName} {lastName}
            </p>
            {jobTitle && (
              <p className="text-sm text-muted-foreground truncate">{jobTitle}</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        {company && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {company}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
};

export default ContactCard;
