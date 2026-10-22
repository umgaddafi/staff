<?php
require '../config/db.php';
require '../includes/header.php';
session_start();
$staff_id = $_SESSION['staff_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO publication (title, publication_type, journal_or_venue, publisher, year_published, doi, url) VALUES (?,?,?,?,?,?,?)");
        $stmt->execute([$_POST['title'], $_POST['type'], $_POST['venue'], $_POST['publisher'], $_POST['year'], $_POST['doi'], $_POST['url']]);
        $pub_id = $pdo->lastInsertId();
        
        $link = $pdo->prepare("INSERT INTO staff_publication (staff_id, publication_id, author_order) VALUES (?, ?, 1)");
        $link->execute([$staff_id, $pub_id]);
        $pdo->commit();
    } catch(Exception $e) {
        $pdo->rollBack();
    }
    header("Location: publications.php"); exit;
}

$pubs = $pdo->prepare("SELECT p.* FROM publication p JOIN staff_publication sp ON p.publication_id = sp.publication_id WHERE sp.staff_id = ? ORDER BY p.year_published DESC");
$pubs->execute([$staff_id]);
?>
<?php if(isset($_GET['status'])): ?>
    <div class="alert alert-info border-0 shadow-sm mb-4">
        <?php if($_GET['status'] == 'submitted'): ?>
            <i class="fas fa-check-circle me-2"></i> Publication submitted! It will appear on your profile once an administrator approves it.
        <?php elseif($_GET['status'] == 'delete_submitted'): ?>
            <i class="fas fa-info-circle me-2"></i> Removal request sent to admin.
        <?php endif; ?>
    </div>
<?php endif; ?>
<div class="container-fluid">
    <div class="row">
       
        <main class="col-lg-10 col-md-9 ms-auto p-4">
            <div class="d-flex justify-content-between mb-4">
                <h3 class="fw-bold">Publications</h3>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#pubModal"><i class="fas fa-plus"></i> Add New</button>
            </div>

            <div class="list-group shadow-sm">
                <?php while($p = $pubs->fetch()): ?>
                <div class="list-group-item p-4 border-0 border-bottom">
                    <div class="d-flex justify-content-between">
                        <div>
                            <span class="badge bg-info text-dark mb-2"><?= $p['publication_type'] ?></span>
                            <h5 class="fw-bold mb-1"><?= htmlspecialchars($p['title']) ?></h5>
                            <p class="text-muted mb-1">
                                <i><?= htmlspecialchars($p['journal_or_venue']) ?></i> | <?= htmlspecialchars($p['publisher']) ?>
                            </p>
                            <?php if($p['doi']): ?>
                                <a href="https://doi.org/<?= $p['doi'] ?>" target="_blank" class="text-primary small"><i class="fas fa-link"></i> DOI: <?= $p['doi'] ?></a>
                            <?php endif; ?>
                        </div>
                        <div class="text-end min-w-100">
                            <h4 class="text-muted fw-bold"><?= $p['year_published'] ?></h4>
                        </div>
                        <a href="./actions/update_publications_core.php?del=<?= $p['publication_id'] ?>" 
                            class="btn btn-sm btn-outline-danger" 
                            onclick="return confirm('Request to remove this publication from your profile?')">
                            <i class="fas fa-trash"></i>
                        </a>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="pubModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <!-- <form method="POST" class="modal-content"> -->
            <form action="./actions/update_publications_core.php" method="POST" class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Add Publication</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3"><label>Title</label><textarea name="title" class="form-control" required></textarea></div>
                <div class="row mb-3">
                    <div class="col"><label>Type</label>
                        <select name="type" class="form-select">
                            <option>Journal</option><option>Conference</option><option>Book</option><option>Book Chapter</option>
                        </select>
                    </div>
                    <div class="col"><label>Year</label><input type="number" name="year" class="form-control" required></div>
                </div>
                <div class="mb-3"><label>Journal / Venue Name</label><input type="text" name="venue" class="form-control"></div>
                <div class="mb-3"><label>Publisher</label><input type="text" name="publisher" class="form-control"></div>
                <div class="row">
                    <div class="col"><label>DOI</label><input type="text" name="doi" class="form-control"></div>
                    <div class="col"><label>URL</label><input type="text" name="url" class="form-control"></div>
                </div>
            </div>
            <div class="modal-footer"><button type="submit" class="btn btn-primary">Save Publication</button></div>
        </form>
    </div>
</div>
<?php require '../includes/footer.php'; ?>