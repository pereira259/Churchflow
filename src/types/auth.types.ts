
export type AuthMode = 'login' | 'signup';

export interface AuthPanelProps {
    mode: AuthMode;
    onToggleMode: () => void;
    className?: string;
}

export interface SocialButtonsProps {
    isLoading?: boolean;
    onGoogleClick: () => Promise<void>;
}
