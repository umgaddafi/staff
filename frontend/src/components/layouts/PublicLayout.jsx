import { Link } from 'react-router-dom';
import jostumMark from '../../assets/jostum.jpeg';

function PublicLayout({ user, children, fullWidth = false }) {
    const isAdminPortalUser = user && (user.role === 'Admin' || user.role === 'Moderator');
    const footerLink = user
        ? { to: isAdminPortalUser ? '/admin' : '/staff', label: `Open ${isAdminPortalUser ? 'Admin' : 'Staff'} Portal` }
        : { to: '/login', label: 'Staff Login' };

    return (
        <div className="public-site">
            <header className="uni-public-header">
                <div className="uni-public-header-inner">
                    <div className="uni-public-brand">
                        <div className="uni-public-logo">
                            <img src={jostumMark} alt="JOSTUM" />
                        </div>
                        <div className="uni-public-copy">
                            <h1>Joseph Sarwuan Tarka University</h1>
                            <h1>Makurdi, Benue State</h1>
                            <p>Service and Excellence</p>
                        </div>
                    </div>
                </div>
            </header>
            {fullWidth ? children : <div className="public-shell">{children}</div>}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-copy">&copy; {new Date().getFullYear()} Developed by Engr. Dr. Philip Omolaye</div>
                    <Link className="landing-footer-action" to={footerLink.to}>
                        {footerLink.label}
                    </Link>
                </div>
            </footer>
        </div>
    );
}

export { PublicLayout };
