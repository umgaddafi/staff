import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop({ threshold = 300 }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > threshold) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [threshold]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            type="button"
            className={`back-to-top-btn ${visible ? 'is-visible' : ''}`}
            onClick={scrollToTop}
            aria-label="Back to top"
            title="Back to top"
        >
            <ArrowUp size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
    );
}
