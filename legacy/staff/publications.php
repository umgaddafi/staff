<?php
// DB Connection and Session are inherited from index.php
$staff_id = $_SESSION['staff_id'];

// --- LOGIC: HANDLE ADD PUBLICATION ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_pub'])) {
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO publication (title, publication_type, journal_or_venue, publisher, year_published, doi, url) VALUES (?,?,?,?,?,?,?)");
        $stmt->execute([$_POST['title'], $_POST['type'], $_POST['venue'], $_POST['publisher'], $_POST['year'], $_POST['doi'], $_POST['url']]);
        $pub_id = $pdo->lastInsertId();
        
        $link = $pdo->prepare("INSERT INTO staff_publication (staff_id, publication_id, author_order) VALUES (?, ?, 1)");
        $link->execute([$staff_id, $pub_id]);
        $pdo->commit();
        echo "<script>window.location.href='?page=publications&status=success';</script>";
    } catch(Exception $e) {
        $pdo->rollBack();
        echo "<script>alert('Error saving publication');</script>";
    }
    exit;
}

// --- DATA FETCHING ---
$pubs = $pdo->prepare("
    SELECT p.* FROM publication p 
    JOIN staff_publication sp ON p.publication_id = sp.publication_id 
    WHERE sp.staff_id = ? 
    ORDER BY p.year_published DESC
");
$pubs->execute([$staff_id]);
$total_pubs = $pubs->rowCount();
?>

<style>
    :root {
        --glass-bg: rgba(255, 255, 255, 0.95);
        --accent-gradient: linear-gradient(135deg, #0d2c56 0%, #1a4a8e 100%);
    }

    /* Mobile-First Floating Action Button (FAB) */
    .btn-add-mobile {
        position: fixed;
        bottom: 2rem;
        right: 1.5rem;
        z-index: 1030;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 25px rgba(13, 44, 86, 0.3);
        background: var(--accent-gradient);
        border: none;
        transition: transform 0.2s;
    }
    .btn-add-mobile:active { transform: scale(0.9); }

    /* Modern Publication Cards */
    .pub-item {
        background: var(--glass-bg);
        border-left: 4px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 16px;
        overflow: visible !important; 
    z-index: 1;
    }
    .pub-item:hover {
        border-left-color: var(--uni-gold);
        transform: translateY(-3px);
        box-shadow: 0 12px 24px rgba(0,0,0,0.06) !important;
        z-index: 10;
    overflow: visible !important;
    }
    .options-container {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 20;
}

    /* Visual Badges */
    .badge-soft {
        font-weight: 600;
        padding: 0.5em 1em;
        border-radius: 8px;
        letter-spacing: 0.02em;
    }
    .type-journal { background: #eef2ff; color: #4338ca; }
    .type-conference { background: #fef2f2; color: #b91c1c; }
    .type-book { background: #ecfdf5; color: #047857; }

    /* Year Indicator Circle */
    .year-circle {
        width: 48px;
        height: 48px;
        background: #f8fafc;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #64748b;
        font-size: 0.85rem;
        border: 1px solid #e2e8f0;
    }

    @media (min-width: 992px) {
        .btn-add-mobile { display: none; }
    }
</style>

<div class="row align-items-end mb-4 g-3">
    <div class="col-12 col-md">
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-1">
                <li class="breadcrumb-item"><a href="?page=dashboard" class="text-decoration-none">Dashboard</a></li>
                <li class="breadcrumb-item active">Publications</li>
            </ol>
        </nav>
        <h2 class="fw-bold text-dark mb-0">Academic Output</h2>
    </div>
    <div class="col-auto d-none d-md-block">
        <button class="btn btn-primary px-4 py-2 rounded-3 shadow-sm" style="background: var(--uni-navy); border:none;" data-bs-toggle="modal" data-bs-target="#pubModal">
            <i class="fas fa-plus-circle me-2"></i>New Entry
        </button>
    </div>
</div>

<button class="btn-add-mobile text-white d-md-none" data-bs-toggle="modal" data-bs-target="#pubModal">
    <i class="fas fa-plus fa-lg"></i>
</button>

<div class="row g-3">
    <?php if($total_pubs == 0): ?>
        <div class="col-12">
            <div class="card border-0 shadow-sm p-5 text-center rounded-4">
                <div class="mb-3">
                    <i class="fas fa-feather-alt fa-3x text-light"></i>
                </div>
                <h5 class="fw-bold">No records found</h5>
                <p class="text-muted small mb-0">Start building your profile by adding your first publication.</p>
            </div>
        </div>
    <?php endif; ?>



<?php while($p = $pubs->fetch()): 
    $typeClass = 'type-' . strtolower(str_replace(' ', '', $p['publication_type']));
?>
<div class="col-12">
    <div class="card pub-item border-0 shadow-sm p-3">
        <div class="options-container">
            <div class="dropdown">
                <button class="btn btn-light btn-sm rounded-circle shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end border-0 shadow-lg">
                    <li>
                        <a class="dropdown-item py-2" href="javascript:void(0)" onclick='editPublication(<?= json_encode($p, JSON_HEX_APOS) ?>)'>
                            <i class="fas fa-edit me-2 text-muted"></i> Edit Entry
                        </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item py-2 text-danger" 
                           href="./actions/update_publications_core.php?action=delete&id=<?= $p['publication_id'] ?>" 
                           onclick="return confirm('Request removal?')">
                            <i class="fas fa-trash-alt me-2"></i> Remove
                        </a>
                    </li>
                </ul>
            </div>
        </div>

        <div class="row g-3 align-items-center">
            <div class="col-auto">
                <div class="year-circle shadow-sm"><?= $p['year_published'] ?></div>
            </div>
            
            <div class="col">
                <div class="pe-4"> 
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="badge-soft <?= $typeClass ?> small" style="font-size: 0.65rem;">
                            <?= strtoupper($p['publication_type']) ?>
                        </span>
                    </div>
                    
                    <h6 class="fw-bold mb-1 text-dark" style="line-height: 1.5;">
                        <?= htmlspecialchars($p['title']) ?>
                    </h6>
                    <p class="text-muted small mb-2 d-flex align-items-center flex-wrap gap-2">
                        <span class="fw-semibold text-secondary"><i class="fas fa-landmark me-1"></i><?= htmlspecialchars($p['journal_or_venue']) ?></span>
                        <span class="d-none d-md-inline text-light-emphasis">|</span>
                        <span><?= htmlspecialchars($p['publisher']) ?></span>
                    </p>
                    
                    <div class="d-flex flex-wrap gap-2 pt-1">
                        <?php if($p['doi']): ?>
                            <a href="https://doi.org/<?= $p['doi'] ?>" target="_blank" class="btn btn-sm btn-outline-light text-dark border-secondary-subtle rounded-pill py-1 px-3" style="font-size: 0.7rem;">
                                <i class="fas fa-barcode me-1 text-warning"></i> DOI: <?= $p['doi'] ?>
                            </a>
                        <?php endif; ?>
                        
                        <?php if($p['url']): ?>
                            <a href="<?= $p['url'] ?>" target="_blank" class="btn btn-sm btn-link text-primary text-decoration-none fw-bold p-0" style="font-size: 0.75rem;">
                                <i class="fas fa-external-link-alt me-1"></i> View Source
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<?php endwhile; ?>

<div class="modal fade" id="pubModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-fullscreen-sm-down modal-dialog-centered">
        <form method="POST" action="?page=publications" class="modal-content border-0">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-800">New Publication</h5>
                <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <p class="text-muted small mb-4">Record your research output to keep your academic portfolio current.</p>
                
                <div class="form-floating mb-3">
                    <textarea name="title" class="form-control" style="height: 100px" placeholder="Title" required></textarea>
                    <label>Full Publication Title</label>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <div class="form-floating">
                            <select name="type" class="form-select">
                                <option>Journal</option>
                                <option>Conference</option>
                                <option>Book</option>
                                <option>Book Chapter</option>
                            </select>
                            <label>Publication Type</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-floating">
                            <input type="number" name="year" class="form-control" value="<?= date('Y') ?>" required>
                            <label>Year Published</label>
                        </div>
                    </div>
                </div>

                <div class="form-floating mb-3">
                    <input type="text" name="venue" class="form-control" placeholder="Venue">
                    <label>Journal or Conference Name</label>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <div class="form-floating">
                            <input type="text" name="doi" class="form-control" placeholder="DOI">
                            <label>DOI (Optional)</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-floating">
                            <input type="url" name="url" class="form-control" placeholder="URL">
                            <label>Website Link</label>
                        </div>
                    </div>
                </div>
                
                <input type="hidden" name="publisher" value="N/A">

                <div class="d-grid">
                    <button type="submit" name="add_pub" class="btn btn-dark py-3 fw-bold rounded-4 shadow" style="background: var(--uni-navy);">
                        Confirm & Save Entry
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>
<script>
function editPublication(data) {
    const modal = new bootstrap.Modal(document.getElementById('pubModal'));
    const form = document.querySelector('#pubModal form');
    
    // Update Modal Title and UI
    document.querySelector('#pubModal .modal-title').innerText = "Edit Publication Entry";
    document.querySelector('#pubModal button[type="submit"]').innerText = "Submit Update Request";
    
    // Fill Form Fields
    form.querySelector('textarea[name="title"]').value = data.title;
    form.querySelector('select[name="type"]').value = data.publication_type;
    form.querySelector('input[name="year"]').value = data.year_published;
    form.querySelector('input[name="venue"]').value = data.journal_or_venue;
    form.querySelector('input[name="doi"]').value = data.doi;
    form.querySelector('input[name="url"]').value = data.url;
    
    // Add hidden input for ID so the backend knows this is an UPDATE
    let idInput = form.querySelector('input[name="publication_id"]');
    if(!idInput) {
        idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.name = 'publication_id';
        form.appendChild(idInput);
    }
    idInput.value = data.publication_id;

    modal.show();
}

// Reset modal when closed so "Add" button works correctly again
document.getElementById('pubModal').addEventListener('hidden.bs.modal', function () {
    const form = this.querySelector('form');
    form.reset();
    this.querySelector('.modal-title').innerText = "New Publication";
    this.querySelector('button[type="submit"]').innerText = "Confirm & Save Entry";
    const idInput = form.querySelector('input[name="publication_id"]');
    if(idInput) idInput.remove();
});
</script>
