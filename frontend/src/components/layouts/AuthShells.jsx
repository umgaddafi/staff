import jostumHall from '../../assets/jostumhall.png';
import jostumMark from '../../assets/jostum.jpeg';
import { AcademicPortalIcon } from '../icons/AppIcons';

function AuthShell({ title, copy, mobileCopy = copy, children, eyebrow = 'JOSTUM Digital Campus' }) {
    return (
        <div className="auth-wrap">
            <div className="auth-shell">
                <div className="auth-mobile-hero card">
                    <div className="brand-lockup">
                        <div className="brand-mark">
                            <img src={jostumMark} alt="JOSTUM" />
                        </div>
                        <div>
                            <p className="page-eyebrow">{eyebrow}</p>
                            <h2>{title}</h2>
                        </div>
                    </div>
                    <p className="muted">{mobileCopy}</p>
                </div>
                <section className="auth-visual">
                    <p className="page-eyebrow">{eyebrow}</p>
                    <h1>{title}</h1>
                    <p className="auth-visual-copy">
                        <span className="copy-mobile">{mobileCopy}</span>
                        <span className="copy-desktop">{copy}</span>
                    </p>
                    <div className="auth-feature-list">
                        <div className="auth-feature-pill">Searchable academic directory</div>
                        <div className="auth-feature-pill">Structured staff portfolios</div>
                        <div className="auth-feature-pill">Approvals and record workflow</div>
                    </div>
                    <div className="auth-visual-card">
                        <img src={jostumHall} alt="JOSTUM campus building" />
                        <div className="auth-visual-meta">
                            <p className="auth-visual-label">Unified university presence</p>
                            <strong>Profiles, records, and discovery designed as one clear experience.</strong>
                        </div>
                    </div>
                </section>
                {children}
            </div>
        </div>
    );
}

function LegacyAuthShell({ title, copy, message = null, messageType = 'error', children, footer = null }) {
    return (
        <div className="legacy-auth-wrap">
            <main className="legacy-auth-main">
                <div className="legacy-auth-panel">
                    <div className="legacy-auth-icon" aria-hidden="true">
                        <AcademicPortalIcon />
                    </div>
                    <h1 className="legacy-auth-title">{title}</h1>
                    <p className="legacy-auth-copy">{copy}</p>
                    {message ? <div className={`legacy-auth-message is-${messageType}`}>{message}</div> : null}
                    {children}
                    {footer ? <div className="legacy-auth-footer">{footer}</div> : null}
                </div>
            </main>
        </div>
    );
}

export { AuthShell, LegacyAuthShell };
