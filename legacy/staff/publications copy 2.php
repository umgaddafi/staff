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
?>

<style>
    .pub-card { border: none; border-radius: 12px; transition: 0.3s; background: #fff; }
    .pub-card:hover { transform: translateX(5px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
    .type-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; }
    .type-journal { background: #e3f2fd; color: #0d47a1; }
    .type-conference { background: #f3e5f5; color: #4a148c; }
    .type-book { background: #fff3e0; color: #e65100; }
    .doi-link { font-family: 'Ubuntu', sans-serif; font-size: 0.85rem; color: var(--uni-gold); text-decoration: none; }
    .doi-link:hover { text-decoration: underline; }
</style>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold mb-1">Publications</h2>
        <p class="text-muted small">Your scholarly contributions and research output.</p>
    </div>
    <button class="btn btn-primary px-4 shadow-sm" style="background: var(--uni-navy);" data-bs-toggle="modal" data-bs-target="#pubModal">
        <i class="fas fa-plus me-2"></i> Add Publication
    </button>
</div>

<div class="row g-3 mb-4 text-center">
    <div class="col-md-4">
        <div class="card border-0 shadow-sm p-3">
            <h3 class="fw-bold text-primary mb-0"><?= $pubs->rowCount(); ?></h3>
            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">Total Works</small>
        </div>
    </div>
</div>

<?php if($pubs->rowCount() == 0): ?>
    <div class="card border-0 shadow-sm p-5 text-center">
        <i class="fas fa-book-open fa-3x text-light mb-3"></i>
        <p class="text-muted">No publications found in your record.</p>
    </div>
<?php endif; ?>

<div class="row g-3">
    <?php while($p = $pubs->fetch()): 
        $typeClass = 'type-' . strtolower(str_replace(' ', '', $p['publication_type']));
    ?>
    <div class="col-12">
        <div class="card pub-card shadow-sm p-3">
            <div class="d-flex align-items-start gap-3">
                <div class="pt-1">
                    <span class="type-badge <?= $typeClass ?>"><?= $p['publication_type'] ?></span>
                </div>
                <div class="flex-grow-1">
                    <h6 class="fw-bold mb-1" style="line-height: 1.4;"><?= htmlspecialchars($p['title']) ?></h6>
                    <p class="text-muted small mb-2">
                        <span class="text-dark fw-bold"><?= $p['year_published'] ?></span> &bull; 
                        <?= htmlspecialchars($p['journal_or_venue']) ?> &bull; 
                        <?= htmlspecialchars($p['publisher']) ?>
                    </p>
                    
                    <div class="d-flex gap-3 align-items-center">
                        <?php if($p['doi']): ?>
                            <a href="https://doi.org/<?= $p['doi'] ?>" target="_blank" class="doi-link">
                                <i class="fas fa-fingerprint me-1"></i> <?= $p['doi'] ?>
                            </a>
                        <?php endif; ?>
                        
                        <?php if($p['url']): ?>
                            <a href="<?= $p['url'] ?>" target="_blank" class="btn btn-sm btn-light text-primary py-0 px-2" style="font-size: 0.75rem;">
                                <i class="fas fa-external-link-alt me-1"></i> View Source
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endwhile; ?>
</div>

<div class="modal fade" id="pubModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <form method="POST" action="?page=publications" class="modal-content border-0 shadow">
            <div class="modal-header bg-dark text-white p-4">
                <h5 class="modal-title fw-bold">Register Publication</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold small">Full Publication Title</label>
                    <textarea name="title" class="form-control" rows="2" required placeholder="Enter the full title..."></textarea>
                </div>
                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Publication Type</label>
                        <select name="type" class="form-select">
                            <option>Journal</option>
                            <option>Conference</option>
                            <option>Book</option>
                            <option>Book Chapter</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Year Published</label>
                        <input type="number" name="year" class="form-control" value="<?= date('Y') ?>" required>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold small">Journal / Conference Name</label>
                    <input type="text" name="venue" class="form-control" placeholder="e.g. IEEE Transactions on Education">
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">DOI (Digital Object Identifier)</label>
                        <input type="text" name="doi" class="form-control" placeholder="10.1000/xyz123">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Website Link (URL)</label>
                        <input type="url" name="url" class="form-control" placeholder="https://...">
                    </div>
                </div>
                <input type="hidden" name="publisher" value="N/A">
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_pub" class="btn btn-dark w-100 py-2 fw-bold">Add to Portfolio</button>
            </div>
        </form>
    </div>
</div>