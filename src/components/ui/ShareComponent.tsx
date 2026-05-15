import React from 'react';
import { Button } from '@/components/ui/Button';
import type { StoryData, Language } from '@/types';
import * as fileService from '@/services/fileService';

interface ShareComponentProps {
    storyData: StoryData;
    language: Language;
}

const ShareButton: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    className: string;
    ariaLabel: string;
}> = ({ onClick, children, className, ariaLabel }) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform transform hover:scale-110 ${className}`}
    >
        {children}
    </button>
);


const ShareComponent: React.FC<ShareComponentProps> = ({ storyData, language }) => {
    const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

    const handleDownloadCover = () => {
        fileService.downloadCoverImage(storyData, language);
    };

    const handleShare = (platform: 'twitter' | 'facebook' | 'whatsapp') => {
        const appUrl = window.location.origin;
        const shareText = t(
            `لقد صنعت للتو كتاب قصة مخصص بعنوان "${storyData.title}" مع راوي! ✨ حيث يصبح كل طفل بطلاً.`,
            `I just created a personalized storybook, "${storyData.title}", with Rawy! ✨ Where every child becomes the hero.`
        );
        const fullMessage = `${shareText} #Rawy #PersonalizedBook`;

        let url = '';
        switch (platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMessage)}&url=${encodeURIComponent(appUrl)}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(fullMessage)}`;
                break;
            case 'whatsapp':
                url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage + '\n' + appUrl)}`;
                break;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg space-y-4">
            <h3 className="text-xl font-bold text-brand-coral text-center">{t('شارك إبداعك!', 'Share Your Creation!')}</h3>
            <p className="text-center text-gray-600 max-w-lg mx-auto">
                {t('هل أعجبتك القصة؟ شاركها مع أصدقائك وعائلتك! قم بتنزيل الغلاف أولاً لتحصل على أفضل نتيجة عند المشاركة.', 'Love the story? Share it with your friends and family! Download the cover first for the best sharing experience.')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                <Button onClick={handleDownloadCover} variant="secondary" className="flex items-center gap-2 !px-6 !py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {t('تنزيل الغلاف', 'Download Cover')}
                </Button>

                <div className="flex items-center justify-center gap-4">
                    <ShareButton onClick={() => handleShare('twitter')} className="bg-[#1DA1F2]" ariaLabel="Share on Twitter">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </ShareButton>
                    <ShareButton onClick={() => handleShare('facebook')} className="bg-[#1877F2]" ariaLabel="Share on Facebook">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.378 14.192 5 15.115 5H18V0H14.192C10.596 0 9 1.583 9 4.615z" /></svg>
                    </ShareButton>
                    <ShareButton onClick={() => handleShare('whatsapp')} className="bg-[#25D366]" ariaLabel="Share on WhatsApp">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M16.75 13.96c.27.42.36.94.11 1.46l-.11.23c-.27.53-.76 1.03-1.24 1.22-.49.19-1.22.38-1.7.19-.48-.19-1.34-.67-2.3-1.14-.95-.48-2.02-1.34-2.82-2.3-1.05-1.24-1.52-2.67-1.43-3.72.09-1.05.67-1.81 1.24-2.19.58-.38 1.22-.58 1.7-.58.26 0 .51.1.75.29l.11.09c.49.48.58 1.22.58 1.46 0 .23-.09.48-.28.72l-.11.13c-.23.28-.47.52-.47.62 0 .09.1.18.28.37.19.19.38.37.67.66.28.28.47.47.76.76.28.28.47.47.56.47.09 0 .28-.19.56-.47.28-.28.47-.47.47-.47.23-.28.47-.47.75-.47.28 0 .57.09.76.19zM12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
                    </ShareButton>
                </div>
            </div>
        </div>
    );
};

export default ShareComponent;
