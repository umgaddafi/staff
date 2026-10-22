import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Avatar, ErrorState, LoadingScreen } from '../../components/common/states';
import { PublicPortfolioIcon, publicProfileLinkIcon } from '../../components/icons/AppIcons';
import { api } from '../../lib/api';
import { formatMoney, getErrorMessage } from '../../utils/formatters';

function PublicProfilePage({ user }) {
    const { staffId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryKey, setRetryKey] = useState(0);
    const [activeSection, setActiveSection] = useState('biography');
    const privatePreview = searchParams.get('private') === '1';

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError('');
            const suffix = privatePreview ? '?private=true' : '';

            try {
                const result = await api(`/api/public/staff/${staffId}${suffix}`);
                if (!cancelled) {
                    setProfile(result);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setProfile(null);
                    setError(getErrorMessage(loadError));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [privatePreview, retryKey, staffId]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [privatePreview, staffId]);

    const staff = profile?.staff ?? null;
    const canPreviewPrivate = Boolean(user && ((user.role === 'Admin' || user.role === 'Moderator') || user.staffId === Number(staffId)));
    const departmentAndCollege = staff
        ? [staff.department_name, staff.college_name].filter(Boolean).join(' • ').toUpperCase()
        : '';
    const contactItems = staff ? [
        staff.email ? { key: 'email', icon: 'mail', value: staff.email, href: `mailto:${staff.email}` } : null,
        staff.phone ? { key: 'phone', icon: 'phone', value: staff.phone } : null,
        staff.office_location ? { key: 'office', icon: 'location', value: staff.office_location } : null,
    ].filter(Boolean) : [];
    const socialLinks = staff ? [
        staff.email ? { key: 'email', label: 'Email', href: `mailto:${staff.email}`, icon: 'mail' } : null,
        ...((profile?.externalProfiles ?? []).map((item, index) => ({
            key: `${item.platform}-${index}`,
            label: item.platform || 'Profile',
            href: item.profile_url,
            icon: publicProfileLinkIcon(item.platform || ''),
        }))),
    ].filter((item) => item && item.href) : [];
    const hasResearch = Boolean(profile && (profile.researchAreas.length > 0 || profile.publications.length > 0));
    const hasTeaching = Boolean(profile && profile.courses.length > 0);
    const hasGrants = Boolean(profile && profile.grants.length > 0);
    const hasEducation = Boolean(profile && profile.qualifications.length > 0);
    const sectionLinks = [
        { id: 'biography', label: 'Bio', title: 'Biography', icon: 'bio' },
        ...(hasResearch ? [{ id: 'research', label: 'Research', title: 'Research', icon: 'research' }] : []),
        ...(hasTeaching ? [{ id: 'teaching', label: 'Teaching', title: 'Teaching', icon: 'teaching' }] : []),
        ...(hasGrants ? [{ id: 'grants', label: 'Grants', title: 'Grants', icon: 'grants' }] : []),
    ];
    const sectionKey = sectionLinks.map((item) => item.id).join('|');

    useEffect(() => {
        setActiveSection(sectionLinks[0]?.id || 'biography');
    }, [sectionKey]);

    useEffect(() => {
        if (!profile) {
            return undefined;
        }

        function handleScroll() {
            let current = sectionLinks[0]?.id || 'biography';

            sectionLinks.forEach((item) => {
                const section = document.getElementById(item.id);
                if (section && window.scrollY >= section.offsetTop - 180) {
                    current = item.id;
                }
            });

            setActiveSection(current);
        }

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [profile, sectionKey]);

    if (loading) {
        return (
            <div className="public-portfolio-page">
                <div className="public-portfolio-state">
                    <LoadingScreen label="Loading staff profile..." compact />
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="public-portfolio-page">
                <div className="public-portfolio-state">
                    <ErrorState
                        title="Staff profile unavailable."
                        message={error || 'The requested profile could not be loaded.'}
                        onRetry={() => setRetryKey((current) => current + 1)}
                    />
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <Link to="/" className="public-portfolio-hero-back-btn" style={{ background: '#006633', color: '#ffffff', display: 'inline-flex' }}>
                            <ArrowLeft size={16} />
                            <span>Back to Staff Directory</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-portfolio-page">
            <nav className="public-portfolio-desktop-nav" aria-label="Portfolio navigation">
                <div className="public-portfolio-shell">
                    <div className="public-portfolio-nav-container">
                        <div className="public-portfolio-nav-left">
                            <Link to="/" className="public-portfolio-back-nav-link" title="Back to Staff Directory">
                                <ArrowLeft size={16} />
                                <span>Back to Directory</span>
                            </Link>
                        </div>

                        <div className="public-portfolio-nav-row">
                            {sectionLinks.map((item) => (
                                <a
                                    key={item.id}
                                    className={`public-portfolio-desktop-link${activeSection === item.id ? ' is-active' : ''}`}
                                    href={`#${item.id}`}
                                    onClick={() => setActiveSection(item.id)}
                                >
                                    {item.title}
                                </a>
                            ))}
                        </div>

                        <div className="public-portfolio-nav-right">
                            <Link to="/" className="public-portfolio-home-pill" title="Homepage">
                                <Home size={15} />
                                <span>Home</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <header className="public-portfolio-header">
                <div className="public-portfolio-shell">
                    <div className="public-portfolio-hero-topbar">
                        <Link to="/" className="public-portfolio-hero-back-btn" title="Back to Staff Directory">
                            <ArrowLeft size={16} />
                            <span>Back to Staff Directory</span>
                        </Link>
                    </div>

                    {privatePreview && (
                        <div className="public-portfolio-preview-banner">
                            This is your private preview and may include pending changes not yet approved by admin.
                        </div>
                    )}
                    <div className="public-portfolio-header-content">
                        <Avatar name={staff.full_name} photoUrl={staff.profile_photo_url} className="public-portfolio-avatar" />
                        <div className="public-portfolio-header-copy">
                            <h1 className="public-portfolio-name">{staff.full_name}</h1>
                            <div className="public-portfolio-rank">{staff.rank_name || 'Academic Staff'}</div>
                            {departmentAndCollege && <div className="public-portfolio-meta">{departmentAndCollege}</div>}

                            {socialLinks.length > 0 && (
                                <div className="public-portfolio-social">
                                    {socialLinks.map((item) => (
                                        <a
                                            key={item.key}
                                            href={item.href}
                                            className="public-portfolio-social-link"
                                            target={item.href.startsWith('mailto:') ? undefined : '_blank'}
                                            rel={item.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                                            title={item.label}
                                            aria-label={item.label}
                                        >
                                            <PublicPortfolioIcon name={item.icon} />
                                        </a>
                                    ))}
                                </div>
                            )}

                            {canPreviewPrivate && (
                                <div className="public-portfolio-utility">
                                    <Link className="public-portfolio-utility-link" to="/staff">
                                        Back to Dashboard
                                    </Link>
                                    <button
                                        className="public-portfolio-utility-link is-outline"
                                        onClick={() => {
                                            setSearchParams((current) => {
                                                const next = new URLSearchParams(current);
                                                if (privatePreview) {
                                                    next.delete('private');
                                                } else {
                                                    next.set('private', '1');
                                                }
                                                return next;
                                            });
                                        }}
                                    >
                                        {privatePreview ? 'View public mode' : 'Preview pending changes'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="public-portfolio-shell">
                <div className="public-portfolio-main">
                    <aside className="public-portfolio-sidebar">
                        {contactItems.length > 0 && (
                            <section className="public-portfolio-card">
                                <h2 className="public-portfolio-card-kicker">Contact Details</h2>
                                <div className="public-portfolio-contact-list">
                                    {contactItems.map((item) => (
                                        <div className="public-portfolio-contact-item" key={item.key}>
                                            <span className="public-portfolio-contact-icon" aria-hidden="true">
                                                <PublicPortfolioIcon name={item.icon} />
                                            </span>
                                            {item.href ? (
                                                <a href={item.href}>{item.value}</a>
                                            ) : (
                                                <span>{item.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {hasEducation && (
                            <section className="public-portfolio-card">
                                <div className="public-portfolio-section-heading">
                                    <span className="public-portfolio-section-icon" aria-hidden="true">
                                        <PublicPortfolioIcon name="education" />
                                    </span>
                                    <h2>Education</h2>
                                </div>
                                <div className="public-portfolio-education-list">
                                    {profile.qualifications.map((item, index) => (
                                        <div className="public-portfolio-education-item" key={`qualification-${index}`}>
                                            <div className="public-portfolio-education-degree">{item.degree}</div>
                                            <div className="public-portfolio-education-school">{item.institution}</div>
                                            <div className="public-portfolio-education-year">{item.year_awarded}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </aside>

                    <main className="public-portfolio-content">
                        <section className="public-portfolio-card public-portfolio-section" id="biography">
                            <div className="public-portfolio-section-heading">
                                <span className="public-portfolio-section-icon" aria-hidden="true">
                                    <PublicPortfolioIcon name="bio" />
                                </span>
                                <h2>Biography</h2>
                            </div>
                            <div className="public-portfolio-body-copy">
                                {staff.biography ? <p>{staff.biography}</p> : <p><em>No biography provided.</em></p>}
                            </div>
                        </section>

                        {hasResearch && (
                            <section className="public-portfolio-card public-portfolio-section" id="research">
                                <div className="public-portfolio-section-heading">
                                    <span className="public-portfolio-section-icon" aria-hidden="true">
                                        <PublicPortfolioIcon name="research" />
                                    </span>
                                    <h2>Research</h2>
                                </div>
                                {profile.researchAreas.length > 0 && (
                                    <div className="public-portfolio-tags">
                                        {profile.researchAreas.map((item, index) => (
                                            <span className="public-portfolio-tag" key={`research-area-${index}`}>{item.name}</span>
                                        ))}
                                    </div>
                                )}
                                {profile.publications.length > 0 && (
                                    <div className="public-portfolio-publications">
                                        <div className="public-portfolio-subheading">Selected Publications</div>
                                        {profile.publications.map((item, index) => (
                                            <div className="public-portfolio-publication" key={`publication-${index}`}>
                                                <div className="public-portfolio-publication-title">{item.title}</div>
                                                <div className="public-portfolio-publication-meta">
                                                    {item.journal_or_venue || item.publication_type}
                                                    {item.year_published ? ` • ${item.year_published}` : ''}
                                                </div>
                                                {(item.doi || item.url) && (
                                                    <a
                                                        className="public-portfolio-paper-link"
                                                        href={item.doi ? `https://doi.org/${item.doi}` : item.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        View Paper
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {hasTeaching && (
                            <section className="public-portfolio-card public-portfolio-section" id="teaching">
                                <div className="public-portfolio-section-heading">
                                    <span className="public-portfolio-section-icon" aria-hidden="true">
                                        <PublicPortfolioIcon name="teaching" />
                                    </span>
                                    <h2>Teaching</h2>
                                </div>
                                <div className="public-portfolio-course-list">
                                    {profile.courses.map((item, index) => (
                                        <div className="public-portfolio-course-item" key={`course-mobile-${index}`}>
                                            <div>
                                                <div className="public-portfolio-course-code">{item.course_code}</div>
                                                <div className="public-portfolio-course-title">{item.course_title}</div>
                                            </div>
                                            <span className="public-portfolio-course-badge">{item.level}L</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="public-portfolio-course-table-wrap">
                                    <table className="public-portfolio-course-table">
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Title</th>
                                                <th>Level</th>
                                                <th>Session</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {profile.courses.map((item, index) => (
                                                <tr key={`course-desktop-${index}`}>
                                                    <td className="public-portfolio-course-code">{item.course_code}</td>
                                                    <td>{item.course_title}</td>
                                                    <td>{item.level}L</td>
                                                    <td>{item.session}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {hasGrants && (
                            <section className="public-portfolio-card public-portfolio-section" id="grants">
                                <div className="public-portfolio-section-heading">
                                    <span className="public-portfolio-section-icon" aria-hidden="true">
                                        <PublicPortfolioIcon name="grants" />
                                    </span>
                                    <h2>Grants</h2>
                                </div>
                                <div className="public-portfolio-grant-list">
                                    {profile.grants.map((item, index) => (
                                        <div className="public-portfolio-grant-item" key={`grant-${index}`}>
                                            <div className="public-portfolio-grant-title">{item.title}</div>
                                            <div className="public-portfolio-grant-meta">
                                                <span>{item.sponsor}</span>
                                                <span>{item.start_year} - {item.end_year}</span>
                                            </div>
                                            {Number(item.amount || 0) > 0 && (
                                                <div className="public-portfolio-grant-amount">{formatMoney(item.amount)}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>

            <nav className="public-portfolio-mobile-nav" aria-label="Portfolio sections">
                <Link to="/" className="public-portfolio-mobile-link" title="Homepage">
                    <Home size={18} />
                    <span>Home</span>
                </Link>
                {sectionLinks.map((item) => (
                    <a
                        key={item.id}
                        className={`public-portfolio-mobile-link${activeSection === item.id ? ' is-active' : ''}`}
                        href={`#${item.id}`}
                        onClick={() => setActiveSection(item.id)}
                    >
                        <PublicPortfolioIcon name={item.icon} />
                        <span>{item.label}</span>
                    </a>
                ))}
            </nav>
            
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-copy">
                        &copy; {new Date().getFullYear()} Developed by Engr. Assoc. Prof. Philip Omolaye
                    </div>
                    <div>
                        {user ? (
                            <Link className="landing-footer-action" to={user.role === 'Admin' || user.role === 'Moderator' ? '/admin' : '/staff'}>
                                {user.role === 'Admin' || user.role === 'Moderator' ? 'Admin Portal' : 'Staff Portal'}
                            </Link>
                        ) : (
                            <Link className="landing-footer-action" to="/login">
                                Staff Portal
                            </Link>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
}

export { PublicProfilePage };
