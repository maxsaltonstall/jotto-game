import { useState } from 'react';

interface InviteLinkProps {
  gameId: string;
}

export function InviteLink({ gameId }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join/${gameId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Jotto Game',
        text: 'Join my Jotto game!',
        url: link,
      });
    }
  };

  return (
    <div className="invite-link">
      <p className="invite-label">Share this link with your friend:</p>
      <div className="invite-row">
        <code className="invite-url">{link}</code>
        <button className="invite-copy" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {'share' in navigator && (
        <button className="invite-share" onClick={handleShare}>
          Share...
        </button>
      )}
    </div>
  );
}
