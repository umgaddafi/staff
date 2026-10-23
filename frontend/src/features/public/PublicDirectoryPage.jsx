import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import jostumGate from '../../assets/jostumgate.png';
import jostumHall from '../../assets/jostumhall.png';
import jostumStudents from '../../assets/jostumstudents.png';
import { Avatar, EmptyState, ErrorState, LoadingScreen } from '../../components/common/states';
import { BackToTop } from '../../components/common/BackToTop';
import { PublicLayout } from '../../components/layouts/PublicLayout';
import { useStaffDepartmentOptions } from '../../hooks/useStaffDepartmentOptions';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/formatters';

const PRIORITY_PF_NUMBERS = ['PF/0583','PF/1229', 'PF/2365', 'PF/1466'];

function normalizePfNumber(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

let cachedDirectoryData = null;
let cachedFilters = { search: '', category: '', faculty: '', department: '', rank: '' };
let cachedScrollPosition = 0;

function getInitialDirectoryData() {
    if (cachedDirectoryData && cachedDirectoryData.items?.length > 0) {
        return cachedDirectoryData;
    }
    try {
        const stored = sessionStorage.getItem('jostum_public_directory_cache');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
                cachedDirectoryData = parsed;
                return parsed;
            }
        }
    } catch {
        // Ignore storage errors
    }
    return { items: [], filters: { faculties: [], departments: [], ranks: [], categories: [] } };
}

function PublicDirectoryPage({ user }) {
    const [directory, setDirectory] = useState(getInitialDirectoryData);
    const [filters, setFilters] = useState(() => cachedFilters);
    const [loading, setLoading] = useState(() => !cachedDirectoryData || cachedDirectoryData.items?.length === 0);
    const [error, setError] = useState('');
    const [retryKey, setRetryKey] = useState(0);

    const setCachedFilters = (updater) => {
        setFilters((current) => {
            const next = typeof updater === 'function' ? updater(current) : updater;
            cachedFilters = next;
            return next;
        });
    };

    // Track scroll position to preserve when navigating to profiles and back
    useEffect(() => {
        const handleScroll = () => {
            cachedScrollPosition = window.scrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Restore scroll position after mount if returning from a profile
    useEffect(() => {
        if (cachedScrollPosition > 0) {
            requestAnimationFrame(() => {
                window.scrollTo({ top: cachedScrollPosition, behavior: 'instant' });
            });
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const hasCached = cachedDirectoryData && cachedDirectoryData.items?.length > 0;
        if (hasCached) {
            setLoading(false);
        }

        async function load() {
            if (!hasCached) {
                setLoading(true);
            }
            setError('');

            try {
                const result = await api('/api/public/staff');
                if (!cancelled) {
                    cachedDirectoryData = result;
                    try {
                        sessionStorage.setItem('jostum_public_directory_cache', JSON.stringify(result));
                    } catch {
                        // Ignore storage quota
                    }
                    setDirectory(result);
                }
            } catch (loadError) {
                if (!cancelled && !hasCached) {
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
    }, [retryKey]);

    const normalizedSearch = filters.search.trim().toLowerCase();
    const departmentOptions = directory.filters.departments || [];
    const availableDepartments = departmentOptions.filter((department) => (
        filters.faculty === ''
            || directory.items.some((item) => item.faculty === filters.faculty && item.department === department)
    ));

    const filteredItems = directory.items.filter((item) => {
        const matchesSearch = normalizedSearch === ''
            || item.name.toLowerCase().includes(normalizedSearch)
            || item.role.toLowerCase().includes(normalizedSearch)
            || (item.pfNumber && item.pfNumber.toLowerCase().includes(normalizedSearch));
        const matchesFaculty = filters.faculty === '' || item.faculty === filters.faculty;
        const matchesDepartment = filters.department === '' || item.department === filters.department;
        const matchesRank = filters.rank === '' || item.role === filters.rank;
        const matchesCategory = filters.category === '' || item.category === filters.category;

        return matchesSearch && matchesFaculty && matchesDepartment && matchesRank && matchesCategory;
    });

    // Create an array of first list (priority PF numbers) to display before appending the rest
    const priorityKeyMap = {
        PF0583: 9,
        PF1229: 10,
        PF2365: 653,
        PF1466: 216,
    };

    const activePriorityPfs = Array.isArray(directory.hierarchyPfNumbers) && directory.hierarchyPfNumbers.length > 0
        ? directory.hierarchyPfNumbers
        : PRIORITY_PF_NUMBERS;

    const firstList = [];
    activePriorityPfs.forEach((targetPf) => {
        const targetKey = normalizePfNumber(targetPf);
        const fallbackId = priorityKeyMap[targetKey];
        const match = filteredItems.find((item) => (
            (item.pfNumber && normalizePfNumber(item.pfNumber) === targetKey) ||
            item.staffId === fallbackId
        ));
        if (match && !firstList.some((item) => item.staffId === match.staffId)) {
            firstList.push(match);
        }
    });

    const firstListIds = new Set(firstList.map((item) => item.staffId));
    const restList = filteredItems.filter((item) => !firstListIds.has(item.staffId));

    // Display first list before appending the rest
    const visibleItems = [...firstList, ...restList];

    const isAdminPortalUser = user && (user.role === 'Admin' || user.role === 'Moderator');
    const staffLoginTarget = user ? (isAdminPortalUser ? '/admin' : '/staff') : '/login';
    const staffLoginLabel = user ? (isAdminPortalUser ? 'Admin Portal' : 'Staff Portal') : 'Staff Login';

    return (
        <PublicLayout user={user} fullWidth>
            <section className="directory-hero-section">
                <div className="directory-hero-slides" aria-hidden="true">
                    <div className="directory-hero-slide" style={{ backgroundImage: `url(${jostumGate})`, animationDelay: '0s' }} />
                    <div className="directory-hero-slide" style={{ backgroundImage: `url(${jostumHall})`, animationDelay: '6s' }} />
                    <div className="directory-hero-slide" style={{ backgroundImage: `url(${jostumStudents})`, animationDelay: '12s' }} />
                </div>
                <div className="directory-hero-overlay" aria-hidden="true" />
                <div className="directory-hero-content">
                    <div className="directory-hero-copy">
                        <h2 className="directory-page-title">JOSTUM Staffs</h2>
                        <p className="directory-hero-subtitle">
                            Explore our professors, researchers, and leaders across faculties and departments.
                        </p>
                        <div className="directory-hero-badges">
                            <span>Research</span>
                            <span>Teaching</span>
                            <span>Innovation</span>
                            <span>Service</span>
                        </div>
                        <div className="directory-hero-actions">
                            <Link className="directory-hero-action is-staff-login" to={staffLoginTarget}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="directory-hero-action-icon" aria-hidden="true">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" />
                                    <line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                                <span>{staffLoginLabel}</span>
                            </Link>
                            <a className="directory-hero-action is-primary" href="#staffGrid">Browse Staff</a>
                            <a className="directory-hero-action is-secondary" href="#filterTools">Filter &amp; Sort</a>
                        </div>
                    </div>
                    <div className="directory-hero-stats">
                        <div className="directory-hero-stat-card">
                            <p className="directory-hero-stat-value">{directory.items.length}</p>
                            <div className="directory-hero-stat-label">Total Staffs</div>
                        </div>
                        <div className="directory-hero-stat-card">
                            <p className="directory-hero-stat-value">{directory.filters.faculties.length}</p>
                            <div className="directory-hero-stat-label">Faculties</div>
                        </div>
                        {/* <div className="directory-hero-stat-card">
                            <p className="directory-hero-stat-value">{directory.filters.departments?.length || 0}</p>
                            <div className="directory-hero-stat-label">Departments</div>
                        </div> */}
                        <div className="directory-hero-stat-card">
                            <p className="directory-hero-stat-value">24/7</p>
                            <div className="directory-hero-stat-label">Directory Access</div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="public-shell public-shell-directory">
                <div className="directory-filter-container" id="filterTools">
                    <div className="directory-filter-bar">
                        <div className="directory-filter-grid">
                            <div className="field directory-filter-search">
                                <input
                                    className="input"
                                    value={filters.search}
                                    onChange={(event) => setCachedFilters((current) => ({ ...current, search: event.target.value }))}
                                    placeholder="Search name or role..."
                                />
                            </div>
                            <div className="field directory-filter-category">
                                <select
                                    className="select"
                                    value={filters.category}
                                    onChange={(event) => setCachedFilters((current) => ({ ...current, category: event.target.value }))}
                                >
                                    <option value="">Category...</option>
                                    {[...new Set(directory.filters.categories || [])].map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="field directory-filter-faculty">
                                <select
                                    className="select"
                                    value={filters.faculty}
                                    onChange={(event) => setCachedFilters((current) => ({
                                        ...current,
                                        faculty: event.target.value,
                                        department: '',
                                    }))}
                                >
                                    <option value="">All Faculties</option>
                                    {[...new Set(directory.filters.faculties || [])].map((faculty) => (
                                        <option key={faculty} value={faculty}>
                                            {faculty}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="field directory-filter-department">
                                <select
                                    className="select"
                                    value={filters.department}
                                    onChange={(event) => setCachedFilters((current) => ({ ...current, department: event.target.value }))}
                                >
                                    <option value="">All Depts</option>
                                    {[...new Set(availableDepartments || [])].map((department) => (
                                        <option key={department} value={department}>
                                            {department}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="field directory-filter-sort">
                                <select
                                    className="select"
                                    value={filters.rank}
                                    onChange={(event) => setCachedFilters((current) => ({ ...current, rank: event.target.value }))}
                                >
                                    <option value="">Rank...</option>
                                    {[...new Set(directory.filters.ranks || [])].map((rank) => (
                                        <option key={rank} value={rank}>
                                            {rank}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="directory-feedback">
                        <LoadingScreen label="Loading staff directory..." compact />
                    </div>
                ) : error ? (
                    <div className="directory-feedback">
                        <ErrorState
                            title="Directory unavailable."
                            message={error}
                            onRetry={() => setRetryKey((current) => current + 1)}
                        />
                    </div>
                ) : visibleItems.length === 0 ? (
                    <div className="directory-feedback" id="staffGrid">
                        <EmptyState title="No staff members found matching your criteria." copy="Try broadening the faculty or department filters." />
                    </div>
                ) : (
                    <div className="directory-staff-grid" id="staffGrid">
                        {visibleItems.map((item) => (
                            <Link className="directory-staff-card" key={item.staffId} to={`/portfolio/${item.staffId}`}>
                                <div className="directory-staff-image-wrap">
                                    <Avatar name={item.name} photoUrl={item.profilePhotoUrl} className="directory-staff-image" imageFit="fill" />
                                </div>
                                <div className="directory-staff-card-body">
                                    <span className="directory-staff-role">{item.role || 'Academic Staff'}</span>
                                    <h3 className="directory-staff-name">{item.name}</h3>
                                    <div className="directory-staff-department">{item.department}</div>
                                </div>
                                <div className="directory-staff-link">View Profile</div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <BackToTop />
        </PublicLayout>
    );
}

export { PublicDirectoryPage };
